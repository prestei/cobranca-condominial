#!/usr/bin/env bash
# Instala o timer de deploy automático NA VPS.
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/cobranca-condominial}"
REMOTE_URL="${REMOTE_URL:-git@github.com-cobranca-condominial:prestei/cobranca-condominial.git}"
BRANCH="${DEPLOY_BRANCH:-main}"

if [[ ! -f "${APP_DIR}/deploy/scripts/remote-git-sync.sh" ]]; then
  echo "ERROR: rode um deploy completo antes (falta remote-git-sync.sh)" >&2
  exit 1
fi

REMOTE_URL="$REMOTE_URL" DEPLOY_BRANCH="$BRANCH" APP_DIR="$APP_DIR" \
  bash "${APP_DIR}/deploy/scripts/remote-git-sync.sh"

chmod +x "${APP_DIR}/deploy/scripts/"*.sh

install -m 644 "${APP_DIR}/deploy/systemd/cobranca-auto-deploy.service" /etc/systemd/system/
install -m 644 "${APP_DIR}/deploy/systemd/cobranca-auto-deploy.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now cobranca-auto-deploy.timer
systemctl status cobranca-auto-deploy.timer --no-pager || true
echo "Auto-deploy instalado (timer a cada 2 min)."