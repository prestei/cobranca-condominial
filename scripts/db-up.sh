#!/usr/bin/env bash
# Sobe só o Postgres local (dev) — usa o compose de produção com profile simplificado.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  cp .env.example .env
fi

# Compose mínimo só com db para desenvolvimento
docker compose -f deploy/docker-compose.yml --env-file deploy/.env.production up -d db 2>/dev/null \
  || docker run -d --name cobranca-db-dev \
    -e POSTGRES_DB=cobranca_condominial \
    -e POSTGRES_USER=cobranca \
    -e POSTGRES_PASSWORD=cobranca_dev \
    -p 5432:5432 \
    -v cobranca_pgdata_dev:/var/lib/postgresql/data \
    postgres:16-alpine

echo "Postgres disponível em localhost:5432"
