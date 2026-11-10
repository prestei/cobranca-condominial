#!/usr/bin/env bash
# Deploy na VPS sem Docker: migrate → build → restart systemd.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cobranca-condominial}"
cd "$APP_DIR"

ENV_FILE="deploy/.env.production"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: falta ${ENV_FILE}" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERROR: DATABASE_URL obrigatória em ${ENV_FILE}" >&2
  exit 1
fi
if [[ -z "${AUTH_SECRET:-}" || ${#AUTH_SECRET} -lt 32 ]]; then
  echo "ERROR: AUTH_SECRET com pelo menos 32 caracteres" >&2
  exit 1
fi

echo "==> Dependências"
npm ci

echo "==> Migrations PostgreSQL"
npm run db:migrate

if [[ -f catalogo-operacional.import.json ]]; then
  echo "==> Importando catálogo operacional para o PostgreSQL"
  node deploy/scripts/importar-catalogo-json.mjs catalogo-operacional.import.json
fi

echo "==> Build Next.js"
npm run build

echo "==> Permissões do usuário do serviço"
id -u cobranca >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin cobranca
chown -R cobranca:cobranca "$APP_DIR"

echo "==> Reinicia serviço"
systemctl daemon-reload || true
systemctl enable cobranca-app.service >/dev/null 2>&1 || true
systemctl restart cobranca-app.service

echo "==> Healthcheck"
ok=0
for i in $(seq 1 40); do
  if curl -fsS "http://127.0.0.1:3000/login" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 2
done
if [[ "$ok" -ne 1 ]]; then
  echo "ERROR: app não respondeu em :3000" >&2
  journalctl -u cobranca-app.service -n 80 --no-pager || true
  exit 1
fi

echo "Deploy OK (Node + PostgreSQL, sem Docker)"
systemctl --no-pager --full status cobranca-app.service | head -n 20 || true
