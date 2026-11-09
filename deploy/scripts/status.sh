#!/usr/bin/env bash
# Status rápido da VPS principal (sem Docker)
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PY="${ROOT}/deploy/scripts/ssh_pty.py"

# shellcheck disable=SC1090
set -a; source "${ROOT}/deploy/secrets/vps.env"; set +a
APP_DIR="${VPS_APP_DIR:-/opt/cobranca-condominial}"
DOMAIN="${DOMAIN:-danieljorgeadv.com}"

python3 "$PY" ssh "systemctl --no-pager --full status cobranca-app.service | head -n 25; echo '---'; curl -I -sS https://${DOMAIN} | head -5 || true; echo '---'; curl -fsS http://127.0.0.1:3000/login >/dev/null && echo 'app:3000 OK' || echo 'app:3000 FAIL'"
