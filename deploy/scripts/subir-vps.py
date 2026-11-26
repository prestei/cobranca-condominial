#!/usr/bin/env python3
"""
Sobe o sistema numa VPS pedindo só IP e senha SSH (domínio padrão automático).

Gera segredos, publica via git (origin), instala Node/Caddy/PostgreSQL,
roda migrations/build e deixa o app no ar via systemd + Caddy.
"""
from __future__ import annotations

import argparse
import base64
import getpass
import os
import secrets
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEPLOY = ROOT / "deploy"
SECRETS_DIR = DEPLOY / "secrets"
SECRETS_FILE = SECRETS_DIR / "vps.env"
ENV_PROD = DEPLOY / ".env.production"
SSH_PTY = DEPLOY / "scripts" / "ssh_pty.py"

DEFAULT_USER = "root"
DEFAULT_DOMAIN = "danieljorgeadv.com"
DEFAULT_APP_DIR = "/opt/cobranca-condominial"
DEFAULT_DB_NAME = "cobranca_condominial"
DEFAULT_DB_USER = "cobranca"

def die(msg: str, code: int = 1) -> None:
    print(f"\nERROR: {msg}", file=sys.stderr)
    raise SystemExit(code)


def normalize_domain(domain_raw: str) -> str:
    domain = domain_raw.strip().lower()
    for prefix in ("https://", "http://"):
        if domain.startswith(prefix):
            domain = domain[len(prefix) :]
    domain = domain.split("/")[0].split(":")[0]
    if domain.startswith("www."):
        domain = domain[4:]
    if not domain or "." not in domain:
        die("Domínio inválido. Ex.: meuescritorio.com.br")
    return domain


def use_paramiko_transport() -> bool:
    if sys.platform == "win32":
        return True
    try:
        import termios  # noqa: F401
    except ImportError:
        return True
    return False


def banner() -> None:
    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║        Cobrança condominial — subir VPS                    ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print()
    print("Informe o IP e a senha SSH. Domínio e demais segredos são automáticos.")
    print(f"(Domínio padrão: {DEFAULT_DOMAIN} — use --domain para outro.)")
    print()


def ask(label: str, *, default: str | None = None, secret: bool = False) -> str:
    suffix = f" [{default}]" if default else ""
    prompt = f"{label}{suffix}: "
    while True:
        raw = getpass.getpass(prompt) if secret else input(prompt)
        value = raw.strip()
        if not value and default is not None:
            return default
        if value:
            return value
        print("  Valor obrigatório.")


def ensure_local_tools() -> None:
    if use_paramiko_transport():
        try:
            import paramiko  # noqa: F401
        except ImportError:
            print("Instalando dependências de deploy (paramiko)…")
            req = DEPLOY / "requirements-deploy.txt"
            code = subprocess.call([sys.executable, "-m", "pip", "install", "-q", "-r", str(req)])
            if code != 0:
                die(f"Falha ao instalar paramiko. Rode: {sys.executable} -m pip install -r deploy/requirements-deploy.txt")
        if shutil.which("ssh-keyscan") is None:
            print("Aviso: ssh-keyscan ausente; a conexão ainda funciona via Paramiko.")
        return

    for bin_name in ("python3", "ssh", "ssh-keyscan"):
        if shutil.which(bin_name) is None:
            die(f"Ferramenta local ausente: {bin_name}")


def write_secrets(host: str, password: str, user: str, domain: str, app_dir: str) -> None:
    SECRETS_DIR.mkdir(parents=True, exist_ok=True)
    SECRETS_FILE.write_text(
        "\n".join(
            [
                f"VPS_HOST={host}",
                f"VPS_USER={user}",
                f"VPS_PASSWORD={password}",
                f"VPS_APP_DIR={app_dir}",
                f"DOMAIN={domain}",
                "",
            ]
        ),
        encoding="utf-8",
    )
    SECRETS_FILE.chmod(0o600)


def write_env_production(domain: str, db_password: str, auth_secret: str) -> None:
    database_url = (
        f"postgresql://{DEFAULT_DB_USER}:{db_password}@127.0.0.1:5432/{DEFAULT_DB_NAME}"
    )
    ENV_PROD.write_text(
        "\n".join(
            [
                f"DOMAIN={domain}",
                f"ACME_EMAIL=admin@{domain}",
                "NODE_ENV=production",
                f"AUTH_SECRET={auth_secret}",
                f"DATABASE_URL={database_url}",
                "NODE_OPTIONS=--max-old-space-size=768",
                f"POSTGRES_DB={DEFAULT_DB_NAME}",
                f"POSTGRES_USER={DEFAULT_DB_USER}",
                f"POSTGRES_PASSWORD={db_password}",
                "",
            ]
        ),
        encoding="utf-8",
    )
    ENV_PROD.chmod(0o600)


class DeployTransport:
    def __init__(self, host: str, user: str, password: str) -> None:
        self.host = host
        self.user = user
        self.password = password
        self._paramiko = use_paramiko_transport()

    def ssh(self, command: str) -> None:
        print(f"\n$ ssh {self.user}@{self.host} {command[:80]}{'…' if len(command) > 80 else ''}")
        if self._paramiko:
            from ssh_paramiko import run_ssh

            code = run_ssh(
                command,
                host=self.host,
                user=self.user,
                password=self.password,
            )
        else:
            env = {
                "VPS_HOST": self.host,
                "VPS_USER": self.user,
                "VPS_PASSWORD": self.password,
            }
            cmd = [sys.executable, str(SSH_PTY), "ssh", command]
            code = subprocess.call(cmd, cwd=str(ROOT), env={**os.environ, **env})
        if code != 0:
            die(f"comando remoto falhou (exit {code})")

    def git_sync_project(self, app_dir: str, remote_url: str, branch: str, github_token: str | None) -> None:
        sys.path.insert(0, str(DEPLOY / "scripts"))
        from deploy_git import remote_git_sync_command, ssh_to_https

        deploy_url = remote_url
        if github_token and deploy_url.startswith("git@"):
            deploy_url = ssh_to_https(deploy_url)

        cmd = remote_git_sync_command(
            app_dir=app_dir,
            remote_url=deploy_url,
            branch=branch,
            github_token=github_token,
        )
        print(f"\n$ git sync → {self.user}@{self.host}:{app_dir} ({branch})")
        code = self._run_ssh_raw(cmd)
        if code != 0:
            die(f"git sync falhou (exit {code})")

    def _run_ssh_raw(self, command: str) -> int:
        if self._paramiko:
            sys.path.insert(0, str(DEPLOY / "scripts"))
            from ssh_paramiko import run_ssh

            return run_ssh(
                command,
                host=self.host,
                user=self.user,
                password=self.password,
            )
        env = {
            "VPS_HOST": self.host,
            "VPS_USER": self.user,
            "VPS_PASSWORD": self.password,
        }
        return subprocess.call(
            [sys.executable, str(SSH_PTY), "ssh", command],
            cwd=str(ROOT),
            env={**os.environ, **env},
        )


def trust_host(host: str) -> None:
    if shutil.which("ssh-keyscan") is None:
        return
    known = Path.home() / ".ssh" / "known_hosts"
    known.parent.mkdir(parents=True, exist_ok=True)
    subprocess.call(
        ["ssh-keyscan", "-H", host],
        stdout=open(known, "a", encoding="utf-8"),
        stderr=subprocess.DEVNULL,
    )


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Sobe a aplicação numa VPS Ubuntu limpa (só IP + senha SSH).",
    )
    parser.add_argument("--host", "--ip", dest="host", help="IP ou hostname da VPS")
    parser.add_argument("--password", "--senha", dest="password", help="Senha SSH do root")
    parser.add_argument(
        "--domain",
        default=DEFAULT_DOMAIN,
        help=f"Domínio HTTPS (padrão: {DEFAULT_DOMAIN})",
    )
    return parser.parse_args(argv)


def main() -> int:
    args = parse_args(sys.argv[1:])
    if not args.host or not args.password:
        banner()
    ensure_local_tools()

    host = args.host or ask("IP da VPS")
    password = args.password or ask("Senha SSH (root)", secret=True)
    domain = normalize_domain(args.domain)
    user = DEFAULT_USER
    app_dir = DEFAULT_APP_DIR

    auth_secret = secrets.token_hex(32)
    db_password = secrets.token_urlsafe(24)

    print("\n==> Gerando segredos e arquivos locais…")
    write_secrets(host, password, user, domain, app_dir)
    write_env_production(domain, db_password, auth_secret)
    trust_host(host)

    sys.path.insert(0, str(DEPLOY / "scripts"))
    from deploy_git import load_secrets as load_deploy_secrets, preflight_deploy, ssh_to_https

    print("\n==> Validando git local (commit publicado no origin)")
    remote_url, branch = preflight_deploy()

    transport = DeployTransport(host, user, password)
    deploy_secrets = load_deploy_secrets()
    github_token = (
        os.environ.get("GITHUB_DEPLOY_TOKEN", "").strip()
        or deploy_secrets.get("GITHUB_DEPLOY_TOKEN", "").strip()
        or None
    )

    print("\n==> 1/5 Preparando pasta remota")
    transport.ssh(f"mkdir -p '{app_dir}/deploy'")

    print("\n==> 2/5 Atualizando código na VPS (git)")
    deploy_url = remote_url
    if github_token and deploy_url.startswith("git@"):
        deploy_url = ssh_to_https(deploy_url)
    transport.git_sync_project(app_dir, deploy_url, branch, github_token)

    print("\n==> 3/5 Enviando .env.production")
    payload = base64.b64encode(ENV_PROD.read_bytes()).decode()
    transport.ssh(
        f"mkdir -p {app_dir}/deploy && "
        f"echo {payload} | base64 -d > {app_dir}/deploy/.env.production && "
        f"chmod 600 {app_dir}/deploy/.env.production"
    )

    print("\n==> 4/5 Bootstrap (Node, Caddy, PostgreSQL, firewall, systemd)")
    transport.ssh(
        f"DOMAIN='{domain}' APP_DIR='{app_dir}' INSTALL_LOCAL_POSTGRES=1 "
        f"bash '{app_dir}/deploy/scripts/remote-bootstrap.sh'"
    )

    print("\n==> 5/5 Build, migrate e start")
    transport.ssh(f"APP_DIR='{app_dir}' bash '{app_dir}/deploy/scripts/ci-remote-deploy.sh'")

    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║                    VPS no ar                             ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print(f"  App local na VPS:  http://{host}:3000/login  (via Caddy use o domínio)")
    print(f"  URL pública:       https://{domain}")
    print()
    print("  DNS: aponte os registros A de")
    print(f"       {domain} e www.{domain} → {host}")
    print("       (Let's Encrypt só emite depois do DNS propagar.)")
    print()
    print("  Admin padrão (se banco estava vazio): PRESTEI / prestei2026*")
    print("  Troque a senha após o primeiro acesso.")
    print()
    print(f"  Credenciais locais salvas em: {SECRETS_FILE}")
    print(f"  Env de produção:              {ENV_PROD}")
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())