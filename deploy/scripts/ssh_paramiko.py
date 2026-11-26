#!/usr/bin/env python3
"""SSH/SFTP com senha via Paramiko (Windows e Unix sem pty/rsync)."""
from __future__ import annotations

import fnmatch
import os
import stat
import sys
from pathlib import Path, PurePosixPath


def _import_paramiko():
    try:
        import paramiko  # type: ignore
    except ImportError:
        print(
            "Pacote paramiko ausente. Instale com:\n"
            "  py -3 -m pip install -r deploy/requirements-deploy.txt",
            file=sys.stderr,
        )
        raise SystemExit(2) from None
    return paramiko


def _connect(host: str, user: str, password: str, timeout: int = 60):
    paramiko = _import_paramiko()
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(
        hostname=host,
        username=user,
        password=password,
        timeout=timeout,
        allow_agent=False,
        look_for_keys=False,
    )
    return client


def run_ssh(
    command: str,
    *,
    host: str,
    user: str,
    password: str,
    timeout: int = 3600,
) -> int:
    client = _connect(host, user, password)
    try:
        print(command, flush=True)
        _, stdout, stderr = client.exec_command(command, timeout=timeout)
        out = stdout.read()
        err = stderr.read()
        if out:
            sys.stdout.buffer.write(out)
            sys.stdout.buffer.flush()
        if err:
            sys.stderr.buffer.write(err)
            sys.stderr.buffer.flush()
        return stdout.channel.recv_exit_status()
    finally:
        client.close()


def _matches_exclude(rel_posix: str, excludes: list[str]) -> bool:
    name = PurePosixPath(rel_posix).name
    parts = PurePosixPath(rel_posix).parts
    for pattern in excludes:
        if pattern.startswith("*."):
            if fnmatch.fnmatch(name, pattern):
                return True
            continue
        if pattern in parts:
            return True
        if rel_posix == pattern or rel_posix.startswith(pattern + "/"):
            return True
    return False


def _upload_bytes(sftp, payload: bytes, remote_file: str, *, executable: bool) -> None:
    """Envia arquivo; scripts shell sempre em LF (Windows costuma gravar CRLF)."""
    import tempfile

    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(payload)
        tmp_path = tmp.name
    try:
        sftp.put(tmp_path, remote_file)
        if executable:
            sftp.chmod(remote_file, 0o755)
    finally:
        os.unlink(tmp_path)


def _sftp_mkdirs(sftp, remote_dir: str) -> None:
    remote_dir = remote_dir.rstrip("/") or "/"
    if remote_dir == "/":
        return
    parts = PurePosixPath(remote_dir).parts
    cur = ""
    for part in parts:
        if not part:
            continue
        cur = f"{cur}/{part}" if cur else f"/{part}"
        try:
            sftp.stat(cur)
        except OSError:
            sftp.mkdir(cur)


def sync_directory(
    local_root: Path,
    remote_root: str,
    *,
    host: str,
    user: str,
    password: str,
    excludes: list[str] | None = None,
) -> int:
    local_root = local_root.resolve()
    excludes = list(excludes or [])
    client = _connect(host, user, password, timeout=120)
    try:
        sftp = client.open_sftp()
        remote_root = remote_root.rstrip("/")
        _sftp_mkdirs(sftp, remote_root)
        total = 0
        for dirpath, dirnames, filenames in os.walk(local_root):
            rel_base = Path(dirpath).relative_to(local_root).as_posix()
            dirnames[:] = [
                d
                for d in dirnames
                if not _matches_exclude(
                    f"{rel_base}/{d}".lstrip("/"),
                    excludes,
                )
            ]
            for name in filenames:
                rel = Path(dirpath, name).relative_to(local_root).as_posix()
                if _matches_exclude(rel, excludes):
                    continue
                local_file = Path(dirpath, name)
                remote_file = f"{remote_root}/{rel}".replace("\\", "/")
                remote_parent = str(PurePosixPath(remote_file).parent)
                _sftp_mkdirs(sftp, remote_parent)
                payload = local_file.read_bytes()
                is_shell = name.endswith(".sh")
                if is_shell:
                    payload = payload.replace(b"\r\n", b"\n").replace(b"\r", b"\n")
                mode = local_file.stat().st_mode
                executable = bool(mode & stat.S_IXUSR) or is_shell
                if is_shell:
                    _upload_bytes(sftp, payload, remote_file, executable=True)
                else:
                    _upload_bytes(sftp, payload, remote_file, executable=executable)
                total += 1
                if total % 200 == 0:
                    print(f"  … {total} arquivos enviados", flush=True)
        sftp.close()
        print(f"  Sync concluído ({total} arquivos).", flush=True)
        return 0
    finally:
        client.close()


def transport_available() -> bool:
    return sys.platform == "win32" or not _has_unix_pty()


def _has_unix_pty() -> bool:
    try:
        import termios  # noqa: F401
    except ImportError:
        return False
    return True