#!/usr/bin/env python3
"""SSH/SCP via PTY com senha (sem sshpass). Uso interno dos scripts de deploy."""
from __future__ import annotations

import os
import pty
import select
import sys
import time
from pathlib import Path


def _load_secrets() -> dict[str, str]:
    root = Path(__file__).resolve().parents[1]
    path = root / "secrets" / "vps.env"
    env: dict[str, str] = {}
    if path.exists():
        for line in path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip("'").strip('"')
    for k in ("VPS_HOST", "VPS_USER", "VPS_PASSWORD", "VPS_APP_DIR", "DOMAIN",
              "STANDBY_HOST", "STANDBY_USER", "STANDBY_PASSWORD"):
        if os.environ.get(k):
            env[k] = os.environ[k]
    return env


def _drain_and_wait(pid: int, fd: int) -> int:
    time.sleep(0.15)
    while True:
        r, _, _ = select.select([fd], [], [], 0.2)
        if fd not in r:
            break
        try:
            chunk = os.read(fd, 8192)
        except OSError:
            break
        if not chunk:
            break
        sys.stdout.buffer.write(chunk)
        sys.stdout.buffer.flush()
    try:
        _wpid, status = os.waitpid(pid, 0)
    except ChildProcessError:
        return 0
    if os.WIFEXITED(status):
        return os.WEXITSTATUS(status)
    return 1


def _run_with_password(argv: list[str], password: str, timeout: int) -> int:
    pid, fd = pty.fork()
    if pid == 0:
        os.execvp(argv[0], argv)

    buf = b""
    sent = False
    deadline = time.time() + timeout
    while time.time() < deadline:
        r, _, _ = select.select([fd], [], [], 1.0)
        if fd in r:
            try:
                chunk = os.read(fd, 8192)
            except OSError:
                return _drain_and_wait(pid, fd)
            if not chunk:
                return _drain_and_wait(pid, fd)
            buf += chunk
            sys.stdout.buffer.write(chunk)
            sys.stdout.buffer.flush()
            if (not sent) and b"password:" in buf.lower():
                os.write(fd, (password + "\n").encode())
                sent = True
                buf = b""
        try:
            wpid, status = os.waitpid(pid, os.WNOHANG)
            if wpid:
                # ainda pode haver output residual
                time.sleep(0.15)
                while True:
                    r, _, _ = select.select([fd], [], [], 0.2)
                    if fd not in r:
                        break
                    try:
                        chunk = os.read(fd, 8192)
                    except OSError:
                        break
                    if not chunk:
                        break
                    sys.stdout.buffer.write(chunk)
                if os.WIFEXITED(status):
                    return os.WEXITSTATUS(status)
                return 1
        except ChildProcessError:
            return 0

    try:
        os.kill(pid, 9)
        os.waitpid(pid, 0)
    except Exception:
        pass
    print("\n[ssh_pty] timeout", file=sys.stderr)
    return 124


def run_ssh(command: str, *, host: str | None = None, user: str | None = None,
            password: str | None = None, timeout: int = 3600) -> int:
    secrets = _load_secrets()
    host = host or secrets.get("VPS_HOST")
    user = user or secrets.get("VPS_USER", "root")
    password = password or secrets.get("VPS_PASSWORD")
    if not host or not password:
        print("Defina VPS_HOST e VPS_PASSWORD em deploy/secrets/vps.env", file=sys.stderr)
        return 2
    argv = [
        "ssh",
        "-o", "StrictHostKeyChecking=accept-new",
        "-o", "PreferredAuthentications=password",
        "-o", "PubkeyAuthentication=no",
        "-o", "ServerAliveInterval=30",
        f"{user}@{host}",
        command,
    ]
    return _run_with_password(argv, password, timeout)


def run_rsync(local: str, remote_path: str, *, excludes: list[str] | None = None,
              timeout: int = 3600) -> int:
    secrets = _load_secrets()
    host = secrets.get("VPS_HOST")
    user = secrets.get("VPS_USER", "root")
    password = secrets.get("VPS_PASSWORD")
    if not host or not password:
        print("Defina VPS_HOST e VPS_PASSWORD em deploy/secrets/vps.env", file=sys.stderr)
        return 2

    rsh = (
        "ssh -o StrictHostKeyChecking=accept-new "
        "-o PreferredAuthentications=password -o PubkeyAuthentication=no"
    )
    args = ["rsync", "-az", "--delete", "-e", rsh]
    for ex in excludes or []:
        args.extend(["--exclude", ex])
    args.extend([local.rstrip("/") + "/", f"{user}@{host}:{remote_path.rstrip('/')}/"])
    return _run_with_password(args, password, timeout)


def main() -> int:
    if len(sys.argv) < 2:
        print("Uso: ssh_pty.py ssh <comando> | ssh_pty.py rsync <local> <remote_path> [excludes...]", file=sys.stderr)
        return 2
    mode = sys.argv[1]
    if mode == "ssh":
        return run_ssh(" ".join(sys.argv[2:]))
    if mode == "rsync":
        if len(sys.argv) < 4:
            print("Uso: ssh_pty.py rsync <local> <remote_path> [excludes...]", file=sys.stderr)
            return 2
        return run_rsync(sys.argv[2], sys.argv[3], excludes=sys.argv[4:])
    print(f"modo desconhecido: {mode}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
