#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
docker compose -f deploy/docker-compose.yml --env-file deploy/.env.production stop db 2>/dev/null || true
docker rm -f cobranca-db-dev 2>/dev/null || true
echo "Postgres parado"
