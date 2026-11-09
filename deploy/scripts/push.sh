#!/usr/bin/env bash
# Atalho: sobe/atualiza a VPS.
# - Sem argumentos / primeira vez: assistente (só IP + senha SSH)
# - Com secrets já salvos: sincroniza e redeploy
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY="${ROOT}/deploy"
SECRETS="${DEPLOY}/secrets/vps.env"
PY="${DEPLOY}/scripts/ssh_pty.py"
ASSISTENTE="${DEPLOY}/scripts/subir-vps.py"

if [[ "${1:-}" == "--assistente" || "${1:-}" == "-i" || ! -f "$SECRETS" ]]; then
  exec python3 "$ASSISTENTE"
fi

# shellcheck disable=SC1090
set -a; source "$SECRETS"; set +a
APP_DIR="${VPS_APP_DIR:-/opt/cobranca-condominial}"
DOMAIN="${DOMAIN:-danieljorgeadv.com}"

if [[ -z "${VPS_HOST:-}" || -z "${VPS_PASSWORD:-}" ]]; then
  echo "Secrets incompletos. Rodando assistente…"
  exec python3 "$ASSISTENTE"
fi

if [[ ! -f "${DEPLOY}/.env.production" ]]; then
  echo "Falta deploy/.env.production — abrindo assistente."
  exec python3 "$ASSISTENTE"
fi

echo "==> Preparando diretório remoto ${APP_DIR}"
python3 "$PY" ssh "mkdir -p '${APP_DIR}/deploy'"

echo "==> Sincronizando código -> ${VPS_USER}@${VPS_HOST}:${APP_DIR}"
python3 "$PY" rsync "$ROOT" "$APP_DIR" \
  node_modules \
  .next \
  .git \
  .freebuff \
  deploy/secrets \
  "*.tsbuildinfo" \
  .env \
  .env.local

echo "==> Enviando .env.production (600)"
python3 - <<PY
import base64
import sys
from pathlib import Path

sys.path.insert(0, r"${DEPLOY}/scripts")
from ssh_pty import run_ssh, _load_secrets

secrets = _load_secrets()
app = secrets.get("VPS_APP_DIR", "/opt/cobranca-condominial")
payload = base64.b64encode(Path(r"${DEPLOY}/.env.production").read_bytes()).decode()
cmd = (
    f"mkdir -p {app}/deploy && "
    f"echo {payload} | base64 -d > {app}/deploy/.env.production && "
    f"chmod 600 {app}/deploy/.env.production"
)
raise SystemExit(run_ssh(cmd))
PY

echo "==> Bootstrap remoto (idempotente)"
python3 "$PY" ssh "DOMAIN='${DOMAIN}' APP_DIR='${APP_DIR}' INSTALL_LOCAL_POSTGRES=1 bash '${APP_DIR}/deploy/scripts/remote-bootstrap.sh'"

echo "==> Deploy (migrate + build + restart)"
python3 "$PY" ssh "APP_DIR='${APP_DIR}' bash '${APP_DIR}/deploy/scripts/ci-remote-deploy.sh'"

echo
echo "Deploy concluído"
echo "    URL: https://${DOMAIN}"
echo "    DNS A de ${DOMAIN} e www.${DOMAIN} → ${VPS_HOST}"
