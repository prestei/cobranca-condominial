#!/usr/bin/env python3
"""
Sobe o sistema numa VPS limpa pedindo só IP e senha SSH.

Gera segredos, instala Node/Caddy/PostgreSQL, sincroniza o código,
roda migrations/build e deixa o app no ar via systemd + Caddy.
"""
from __future__ import annotations

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


def banner() -> None:
    print()
    print("╔══════════════════════════════════════════════════════════╗")
    print("║   Cobrança condominial — subir VPS limpa (sem Docker)  ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print()
    print("Informe apenas o IP e a senha SSH. O restante é automático.")
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
    for bin_name in ("python3", "rsync", "ssh", "ssh-keyscan"):
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


def run_ssh_pty(*args: str, env: dict[str, str] | None = None) -> None:
    cmd = [sys.executable, str(SSH_PTY), *args]
    merged = os.environ.copy()
    if env:
        merged.update(env)
    print(f"\n$ {' '.join(args)}")
    code = subprocess.call(cmd, cwd=str(ROOT), env=merged)
    if code != 0:
        die(f"comando remoto falhou (exit {code}): {' '.join(args)}")


def trust_host(host: str) -> None:
    known = Path.home() / ".ssh" / "known_hosts"
    known.parent.mkdir(parents=True, exist_ok=True)
    subprocess.call(
        ["ssh-keyscan", "-H", host],
        stdout=open(known, "a", encoding="utf-8"),
        stderr=subprocess.DEVNULL,
    )


def main() -> int:
    banner()
    ensure_local_tools()

    host = ask("IP da VPS")
    password = ask("Senha SSH (root)", secret=True)
    user = DEFAULT_USER
    domain = DEFAULT_DOMAIN
    app_dir = DEFAULT_APP_DIR

    auth_secret = secrets.token_hex(32)
    db_password = secrets.token_urlsafe(24)

    print("\n==> Gerando segredos e arquivos locais…")
    write_secrets(host, password, user, domain, app_dir)
    write_env_production(domain, db_password, auth_secret)
    trust_host(host)

    env = {
        "VPS_HOST": host,
        "VPS_USER": user,
        "VPS_PASSWORD": password,
        "VPS_APP_DIR": app_dir,
        "DOMAIN": domain,
    }

    print("\n==> 1/5 Preparando pasta remota")
    run_ssh_pty("ssh", f"mkdir -p '{app_dir}/deploy'", env=env)

    print("\n==> 2/5 Enviando código")
    run_ssh_pty(
        "rsync",
        str(ROOT),
        app_dir,
        "node_modules",
        ".next",
        ".git",
        ".freebuff",
        "deploy/secrets",
        "*.tsbuildinfo",
        ".env",
        ".env.local",
        env=env,
    )

    print("\n==> 3/5 Enviando .env.production")
    payload = base64.b64encode(ENV_PROD.read_bytes()).decode()
    run_ssh_pty(
        "ssh",
        (
            f"mkdir -p {app_dir}/deploy && "
            f"echo {payload} | base64 -d > {app_dir}/deploy/.env.production && "
            f"chmod 600 {app_dir}/deploy/.env.production"
        ),
        env=env,
    )

    print("\n==> 4/5 Bootstrap (Node, Caddy, PostgreSQL, firewall, systemd)")
    run_ssh_pty(
        "ssh",
        (
            f"DOMAIN='{domain}' APP_DIR='{app_dir}' INSTALL_LOCAL_POSTGRES=1 "
            f"bash '{app_dir}/deploy/scripts/remote-bootstrap.sh'"
        ),
        env=env,
    )

    print("\n==> 5/5 Build, migrate e start")
    run_ssh_pty(
        "ssh",
        f"APP_DIR='{app_dir}' bash '{app_dir}/deploy/scripts/ci-remote-deploy.sh'",
        env=env,
    )

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
