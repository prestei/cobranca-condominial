#!/usr/bin/env bash
# Provisiona a VPS de contingência (banco espelho).
# Pré-requisitos:
#   - VPS principal já no ar com Postgres replicável
#   - deploy/.env.standby preenchido
#   - STANDBY_* em deploy/secrets/vps.env
# Uso: ./deploy/scripts/setup-standby.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY="${ROOT}/deploy"
SECRETS="${DEPLOY}/secrets/vps.env"

if [[ ! -f "$SECRETS" ]]; then
  echo "Crie ${SECRETS}" >&2
  exit 1
fi
# shellcheck disable=SC1090
set -a; source "$SECRETS"; set +a

: "${STANDBY_HOST:?Defina STANDBY_HOST em secrets/vps.env}"
: "${STANDBY_PASSWORD:?Defina STANDBY_PASSWORD em secrets/vps.env}"
STANDBY_USER="${STANDBY_USER:-root}"
APP_DIR="${VPS_APP_DIR:-/opt/cobranca-condominial}"

if [[ ! -f "${DEPLOY}/.env.standby" ]]; then
  echo "Gere ${DEPLOY}/.env.standby (veja env.example — seção standby)" >&2
  exit 1
fi

export VPS_HOST="$STANDBY_HOST"
export VPS_USER="$STANDBY_USER"
export VPS_PASSWORD="$STANDBY_PASSWORD"

PY="${DEPLOY}/scripts/ssh_pty.py"

echo "==> Bootstrap Docker na contingência ${STANDBY_HOST}"
python3 "$PY" ssh 'bash -s' <<'REMOTE'
set -euo pipefail
if ! command -v docker >/dev/null; then
  apt-get update -y
  apt-get install -y ca-certificates curl
  curl -fsSL https://get.docker.com | sh
fi
mkdir -p /opt/cobranca-condominial/deploy
REMOTE

echo "==> Enviando arquivos de standby"
python3 "$PY" rsync "${DEPLOY}/" "${APP_DIR}/deploy" secrets "*.env.production"

python3 - <<PY
import base64, sys
from pathlib import Path
sys.path.insert(0, r"${DEPLOY}/scripts")
from ssh_pty import run_ssh
app = "${APP_DIR}"
payload = base64.b64encode(Path(r"${DEPLOY}/.env.standby").read_bytes()).decode()
raise SystemExit(run_ssh(
  f"echo {payload} | base64 -d > {app}/deploy/.env.standby && chmod 600 {app}/deploy/.env.standby"
))
PY

echo "==> Subindo Postgres standby (streaming replication)"
python3 "$PY" ssh "cd '${APP_DIR}/deploy' && chmod +x postgres/standby/entrypoint-standby.sh && docker compose -f docker-compose.standby.yml --env-file .env.standby up -d"

echo "==> Standby iniciado. Verifique: SELECT * FROM pg_stat_replication; no primary"
