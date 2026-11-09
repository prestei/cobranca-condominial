#!/usr/bin/env bash
# Roda NA VPS após o CI sincronizar o código (ou via webhook/local).
# Idempotente: rebuild da app e recreate sem tocar no .env.production.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

APP_DIR="${APP_DIR:-/opt/cobranca-condominial}"
cd "${APP_DIR}/deploy"

if [[ ! -f .env.production ]]; then
  echo "Falta ${APP_DIR}/deploy/.env.production" >&2
  exit 1
fi

chmod +x postgres/primary/docker-entrypoint-initdb.d/*.sh 2>/dev/null || true
chmod +x postgres/standby/*.sh 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true

# Swap generoso evita OOM no next build (VPS ~1.6GB)
if ! swapon --show | grep -q .; then
  if [[ -f /swapfile ]]; then swapon /swapfile || true; fi
fi

echo "==> Build app"
DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-0}" docker compose --env-file .env.production build app

echo "==> Up"
docker compose --env-file .env.production up -d --remove-orphans --force-recreate app

echo "==> Status"
docker compose --env-file .env.production ps
echo "CI remote deploy OK"
