#!/usr/bin/env bash
# Deploy na VPS sem Docker: migrate → build → restart systemd.
set -euo pipefail

# Evita corrida entre GitHub Actions e npm run vps:push no mesmo host.
exec 9>/var/lock/cobranca-deploy.lock
if ! flock -w 900 9; then
  echo "ERROR: outro deploy ainda em andamento (lock /var/lock/cobranca-deploy.lock)" >&2
  exit 1
fi

APP_DIR="${APP_DIR:-/opt/cobranca-condominial}"
cd "$APP_DIR"

# Build válido anterior (rollback se migrate/build/healthcheck falhar).
NEXT_BACKUP_DIR=".next-deploy-backup"

next_runnable() {
  [[ -d .next ]] && [[ -f .next/BUILD_ID ]] && [[ -f .next/prerender-manifest.json ]]
}

rollback_next_and_restart() {
  local code="${1:-1}"
  if [[ "${DEPLOY_HAD_NEXT_BACKUP:-0}" -eq 1 && -d "$NEXT_BACKUP_DIR" ]]; then
    echo "==> Rollback: restaurando .next anterior e subindo cobranca-app" >&2
    rm -rf .next 2>/dev/null || true
    mv "$NEXT_BACKUP_DIR" .next
    systemctl daemon-reload >/dev/null 2>&1 || true
    systemctl restart cobranca-app.service >/dev/null 2>&1 \
      || systemctl start cobranca-app.service >/dev/null 2>&1 \
      || true
  fi
  trap - ERR
  exit "$code"
}

deploy_trap_err() {
  echo "==> Deploy falhou — executando rollback (se houver build anterior)" >&2
  rollback_next_and_restart "$?"
}

trap deploy_trap_err ERR

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
# Para o app para não travar remoção de node_modules.
systemctl stop cobranca-app.service >/dev/null 2>&1 || true

DEPLOY_HAD_NEXT_BACKUP=0
if next_runnable; then
  rm -rf "$NEXT_BACKUP_DIR"
  mv .next "$NEXT_BACKUP_DIR"
  DEPLOY_HAD_NEXT_BACKUP=1
  echo "==> Backup do build em uso: ${NEXT_BACKUP_DIR}"
elif [[ -d .next ]]; then
  # Resíduo de build interrompido — não serve para rollback.
  rm -rf .next
fi

# Evita ENOTEMPTY/ENOENT residual de installs interrompidos ou em corrida.
chmod -R u+w node_modules 2>/dev/null || true
rm -rf node_modules
# Preferir npm ci; se o cache/extracao falhar, limpa cache e tenta de novo.
if ! npm ci; then
  echo "==> npm ci falhou; limpando cache e retentando"
  npm cache clean --force >/dev/null 2>&1 || true
  rm -rf node_modules
  npm ci
fi

echo "==> Prisma generate + migrate deploy"
npx prisma generate
# Produção já tem schema (docs/migrations/*.sql): marca baseline antes do deploy
# para evitar P3005 em banco não vazio sem _prisma_migrations.
npx prisma migrate resolve --applied 20261110120000_baseline >/dev/null 2>&1 || true
npx prisma migrate deploy

if [[ -f catalogo-operacional.import.json ]]; then
  echo "==> Importando catálogo operacional para o PostgreSQL"
  node deploy/scripts/importar-catalogo-json.mjs catalogo-operacional.import.json
fi

echo "==> Build Next.js"
npm run build

if ! next_runnable; then
  echo "ERROR: build não gerou .next utilizável (BUILD_ID / prerender-manifest)" >&2
  rollback_next_and_restart 1
fi

echo "==> Permissões do usuário do serviço"
id -u cobranca >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin cobranca
chown -R cobranca:cobranca "$APP_DIR"

echo "==> Atualiza unit systemd (TimeoutStopSec / flush no SIGTERM)"
if [[ -f "$APP_DIR/deploy/systemd/cobranca-app.service" ]]; then
  install -m 644 "$APP_DIR/deploy/systemd/cobranca-app.service" /etc/systemd/system/cobranca-app.service
  if id -u cobranca >/dev/null 2>&1; then
    sed -i 's/^User=.*/User=cobranca/' /etc/systemd/system/cobranca-app.service
    sed -i 's/^Group=.*/Group=cobranca/' /etc/systemd/system/cobranca-app.service
  fi
fi

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
  rollback_next_and_restart 1
fi

if [[ "${DEPLOY_HAD_NEXT_BACKUP:-0}" -eq 1 ]]; then
  rm -rf "$NEXT_BACKUP_DIR"
fi
trap - ERR

echo "Deploy OK (Node + PostgreSQL, sem Docker)"
systemctl --no-pager --full status cobranca-app.service | head -n 20 || true
