#!/usr/bin/env python3
"""Prepara Postgres local (fora do Docker) e copia o snapshot operacional salvo."""
from __future__ import annotations

import re
import subprocess
from pathlib import Path

APP_DIR = Path("/opt/cobranca-condominial")
ENV_FILE = APP_DIR / "deploy" / ".env.production"
CATALOGO_DOCKER = Path("/var/lib/docker/volumes/cobranca_catalogo_data/_data/catalogo-operacional.json")
CATALOGO_IMPORT = APP_DIR / "catalogo-operacional.import.json"
PG_PORT = "5433"


def load_env() -> dict[str, str]:
    env: dict[str, str] = {}
    for line in ENV_FILE.read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            key, value = line.split("=", 1)
            env[key] = value
    return env


def main() -> None:
    text = ENV_FILE.read_text()
    text2 = re.sub(
        r"(DATABASE_URL=postgresql://[^@]+@)[^/\s]+/",
        r"\g<1>127.0.0.1:5433/",
        text,
    )
    if text2 != text:
        ENV_FILE.write_text(text2)
        print("DATABASE_URL -> 127.0.0.1:5433")

    env = load_env()
    user = env["POSTGRES_USER"]
    password = env["POSTGRES_PASSWORD"]
    db = env["POSTGRES_DB"]
    pw = password.replace("'", "''")

    sql = f"""
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '{user}') THEN
    CREATE ROLE {user} LOGIN PASSWORD '{pw}';
  ELSE
    ALTER ROLE {user} WITH LOGIN PASSWORD '{pw}';
  END IF;
END
$$;
"""
    subprocess.check_call(
        ["sudo", "-u", "postgres", "psql", "-p", PG_PORT, "-v", "ON_ERROR_STOP=1", "-c", sql]
    )
    exists = subprocess.check_output(
        [
            "sudo",
            "-u",
            "postgres",
            "psql",
            "-p",
            PG_PORT,
            "-tAc",
            f"SELECT 1 FROM pg_database WHERE datname='{db}'",
        ],
        text=True,
    ).strip()
    if exists != "1":
        subprocess.check_call(
            ["sudo", "-u", "postgres", "createdb", "-p", PG_PORT, "-O", user, db]
        )
        print("createdb", db)
    else:
        print("database exists", db)

    hba = subprocess.check_output(
        ["sudo", "-u", "postgres", "psql", "-p", PG_PORT, "-tAc", "SHOW hba_file"],
        text=True,
    ).strip()
    path = Path(hba)
    content = path.read_text()
    marker = "cobranca-app-local"
    if marker not in content:
        path.write_text(
            content
            + f"\n# {marker}\n"
            + f"host    {db}    {user}    127.0.0.1/32    scram-sha-256\n"
            + f"host    {db}    {user}    ::1/128         scram-sha-256\n"
        )
        subprocess.call(["systemctl", "reload", "postgresql"])
        print("hba updated")

    if CATALOGO_DOCKER.is_file():
        CATALOGO_IMPORT.write_bytes(CATALOGO_DOCKER.read_bytes())
        print("catalog copied", CATALOGO_IMPORT)
    else:
        print("WARNING: catalog docker file missing")

    print("DATABASE_URL host", env.get("DATABASE_URL", "").split("@")[-1])


if __name__ == "__main__":
    main()
