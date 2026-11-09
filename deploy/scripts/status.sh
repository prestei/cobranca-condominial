#!/usr/bin/env bash
# Status rápido da VPS principal
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PY="${ROOT}/deploy/scripts/ssh_pty.py"
APP_DIR="${VPS_APP_DIR:-/opt/cobranca-condominial}"

# shellcheck disable=SC1090
set -a; source "${ROOT}/deploy/secrets/vps.env"; set +a
APP_DIR="${VPS_APP_DIR:-/opt/cobranca-condominial}"

python3 "$PY" ssh "cd '${APP_DIR}/deploy' && docker compose --env-file .env.production ps && echo '---' && docker compose --env-file .env.production exec -T db psql -U \"\${POSTGRES_USER:-cobranca}\" -d \"\${POSTGRES_DB:-cobranca_condominial}\" -c 'SELECT client_addr, state, sync_state FROM pg_stat_replication;' || true && echo '---' && curl -I -s https://${DOMAIN:-danieljorgeadv.com} | head -5 || curl -I -s http://127.0.0.1 | head -5"
