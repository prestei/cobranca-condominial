#!/usr/bin/env bash
# Instala o timer de deploy automático NA VPS.
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/cobranca-condominial}"
REMOTE_URL="${REMOTE_URL:-git@github.com-cobranca-condominial:prestei/cobranca-condominial.git}"
BRANCH="${DEPLOY_BRANCH:-main}"

cd "$APP_DIR"

if [[ ! -d .git ]]; then
  echo "==> Inicializando git em ${APP_DIR}"
  git init -b "$BRANCH"
  git remote add origin "$REMOTE_URL" 2>/dev/null || git remote set-url origin "$REMOTE_URL"
  # Preserva .env.production
  ENV_BAK=""
  if [[ -f deploy/.env.production ]]; then
    ENV_BAK="$(mktemp)"
    cp -a deploy/.env.production "$ENV_BAK"
  fi
  git fetch origin "$BRANCH"
  git reset --hard "origin/${BRANCH}"
  if [[ -n "$ENV_BAK" ]]; then
    cp -a "$ENV_BAK" deploy/.env.production
    chmod 600 deploy/.env.production
    rm -f "$ENV_BAK"
  fi
else
  git remote set-url origin "$REMOTE_URL" 2>/dev/null || git remote add origin "$REMOTE_URL"
  git fetch origin "$BRANCH"
fi

chmod +x "$APP_DIR/deploy/scripts/"*.sh

install -m 644 "$APP_DIR/deploy/systemd/cobranca-auto-deploy.service" /etc/systemd/system/
install -m 644 "$APP_DIR/deploy/systemd/cobranca-auto-deploy.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now cobranca-auto-deploy.timer
systemctl status cobranca-auto-deploy.timer --no-pager || true
echo "Auto-deploy instalado (timer a cada 2 min)."
