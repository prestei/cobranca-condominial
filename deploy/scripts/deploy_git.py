#!/usr/bin/env python3
"""Preflight local + git sync na VPS (substitui rsync/SFTP arquivo a arquivo)."""
from __future__ import annotations

import argparse
import base64
import re
import shlex
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEPLOY = ROOT / "deploy"
SECRETS = DEPLOY / "secrets" / "vps.env"
SYNC_SCRIPT = DEPLOY / "scripts" / "remote-git-sync.sh"
SSH_PTY = DEPLOY / "scripts" / "ssh_pty.py"

DEFAULT_REMOTE_HTTPS = "https://github.com/prestei/cobranca-condominial.git"


def die(msg: str, code: int = 1) -> None:
    print(f"\nERROR: {msg}", file=sys.stderr)
    raise SystemExit(code)


def load_secrets() -> dict[str, str]:
    env: dict[str, str] = {}
    if SECRETS.exists():
        for line in SECRETS.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip("'").strip('"')
    return env


def ssh_to_https(url: str) -> str:
    m = re.match(r"git@([^:]+):(.+?)(?:\.git)?$", url.strip())
    if m:
        host, path = m.groups()
        return f"https://{host}/{path}.git" if not path.endswith(".git") else f"https://{host}/{path}"
    return url.strip()


def git_origin_url() -> str:
    try:
        out = subprocess.check_output(
            ["git", "remote", "get-url", "origin"],
            cwd=ROOT,
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return DEFAULT_REMOTE_HTTPS
    return out


def git_default_branch() -> str:
    try:
        return subprocess.check_output(
            ["git", "branch", "--show-current"],
            cwd=ROOT,
            text=True,
        ).strip() or "main"
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "main"


def resolve_remote_url(secrets: dict[str, str]) -> str:
    custom = secrets.get("DEPLOY_GIT_URL", "").strip()
    if custom:
        return custom
    return git_origin_url()


def preflight_deploy(*, strict_clean: bool = True) -> tuple[str, str]:
    if not (ROOT / ".git").is_dir():
        die("Este diretório não é um repositório git.")

    dirty = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
    if strict_clean and dirty:
        die("Há alterações locais sem commit. Faça commit antes do deploy.")

    branch = git_default_branch()
    subprocess.run(["git", "fetch", "origin", branch], cwd=ROOT, check=True)
    local = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
    try:
        remote = subprocess.check_output(
            ["git", "rev-parse", f"origin/{branch}"],
            cwd=ROOT,
            text=True,
        ).strip()
    except subprocess.CalledProcessError:
        die(f"Branch origin/{branch} não encontrada. Rode git push origin {branch}.")

    # commits locais que ainda não estão no origin
    unpushed = subprocess.run(
        ["git", "rev-list", f"origin/{branch}..HEAD"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
    if unpushed:
        die(
            f"O commit local ({local[:7]}) ainda não está no origin. "
            f"Rode: git push origin {branch}"
        )

    if local != remote:
        die(
            f"HEAD local ({local[:7]}) difere de origin/{branch} ({remote[:7]}). "
            "Faça git pull ou git push até alinhar."
        )

    remote_url = resolve_remote_url(load_secrets())
    return remote_url, branch


def remote_git_sync_command(
    *,
    app_dir: str,
    remote_url: str,
    branch: str,
    github_token: str | None,
) -> str:
    if not SYNC_SCRIPT.is_file():
        die(f"Script ausente: {SYNC_SCRIPT}")
    script_b64 = base64.b64encode(SYNC_SCRIPT.read_bytes()).decode()
    env = [
        f"APP_DIR={shlex.quote(app_dir)}",
        f"DEPLOY_BRANCH={shlex.quote(branch)}",
        f"REMOTE_URL={shlex.quote(remote_url)}",
    ]
    if github_token:
        env.append(f"GITHUB_DEPLOY_TOKEN={shlex.quote(github_token)}")
    env_prefix = " ".join(env)
    return (
        f"echo {script_b64} | base64 -d > /tmp/cobranca-remote-git-sync.sh && "
        f"chmod +x /tmp/cobranca-remote-git-sync.sh && "
        f"{env_prefix} bash /tmp/cobranca-remote-git-sync.sh"
    )


def run_ssh(command: str) -> int:
    sys.path.insert(0, str(DEPLOY / "scripts"))
    try:
        import termios  # noqa: F401

        use_pty = sys.platform != "win32"
    except ImportError:
        use_pty = False

    secrets = load_secrets()
    host = secrets.get("VPS_HOST")
    user = secrets.get("VPS_USER", "root")
    password = secrets.get("VPS_PASSWORD")
    if not host or not password:
        die("Defina VPS_HOST e VPS_PASSWORD em deploy/secrets/vps.env")

    if sys.platform == "win32" or not use_pty:
        from ssh_paramiko import run_ssh as paramiko_ssh

        return paramiko_ssh(command, host=host, user=user, password=password)

    import os

    env = {**os.environ, "VPS_HOST": host, "VPS_USER": user, "VPS_PASSWORD": password}
    return subprocess.call([sys.executable, str(SSH_PTY), "ssh", command], env=env)


def cmd_preflight(_: argparse.Namespace) -> int:
    url, branch = preflight_deploy()
    print(f"OK para deploy: origin/{branch} @ {url}")
    return 0


def cmd_sync(_: argparse.Namespace) -> int:
    secrets = load_secrets()
    remote_url, branch = preflight_deploy()
    app_dir = secrets.get("VPS_APP_DIR", "/opt/cobranca-condominial")
    token = secrets.get("GITHUB_DEPLOY_TOKEN", "").strip() or None
    deploy_url = remote_url
    if token and deploy_url.startswith("git@"):
        deploy_url = ssh_to_https(deploy_url)

    cmd = remote_git_sync_command(
        app_dir=app_dir,
        remote_url=deploy_url,
        branch=branch,
        github_token=token,
    )
    host = secrets.get("VPS_USER", "root") + "@" + secrets.get("VPS_HOST", "")
    print(f"\n$ git sync → {host}:{app_dir} ({branch})")
    code = run_ssh(cmd)
    if code != 0:
        die(f"git sync falhou (exit {code})")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Deploy via git na VPS")
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("preflight", help="Valida commit limpo e publicado no origin")
    sub.add_parser("sync", help="Preflight + git fetch/reset na VPS")
    args = parser.parse_args(argv)
    if args.cmd == "preflight":
        return cmd_preflight(args)
    if args.cmd == "sync":
        return cmd_sync(args)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())