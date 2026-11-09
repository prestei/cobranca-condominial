#!/usr/bin/env bash
# Deploy blue/green SEM derrubar o site online.
# 1) Build da imagem nova (slot atual continua no ar)
# 2) Sobe o slot inativo
# 3) Healthcheck
# 4) Troca o upstream do Caddy + reload
# 5) Para o slot antigo
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
export HOME="${HOME:-/root}"

APP_DIR="${APP_DIR:-/opt/cobranca-condominial}"
cd "${APP_DIR}/deploy"

if [[ ! -f .env.production ]]; then
  echo "Falta ${APP_DIR}/deploy/.env.production" >&2
  exit 1
fi

chmod +x postgres/primary/docker-entrypoint-initdb.d/*.sh 2>/dev/null || true
chmod +x postgres/standby/*.sh 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true

mkdir -p runtime
[[ -f runtime/active-slot ]] || echo blue > runtime/active-slot
[[ -f runtime/upstream ]] || echo 'reverse_proxy app_blue:3000' > runtime/upstream

if ! swapon --show | grep -q .; then
  [[ -f /swapfile ]] && swapon /swapfile || true
fi

ACTIVE="$(tr -d '[:space:]' < runtime/active-slot)"
[[ "$ACTIVE" == "blue" || "$ACTIVE" == "green" ]] || ACTIVE=blue
if [[ "$ACTIVE" == "blue" ]]; then NEXT=green; else NEXT=blue; fi

NEXT_SERVICE="app_${NEXT}"
ACTIVE_SERVICE="app_${ACTIVE}"
NEXT_CTR="cobranca-app-${NEXT}"
ACTIVE_CTR="cobranca-app-${ACTIVE}"

echo "==> Slot ativo: ${ACTIVE} | novo: ${NEXT}"

# DB + Caddy (não mexe no app ativo)
DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-0}" docker compose --env-file .env.production up -d db caddy

# Migração one-shot: container legado cobranca-app-1 → blue
if docker ps -a --format '{{.Names}}' | grep -qx 'cobranca-app-1'; then
  if ! docker ps --format '{{.Names}}' | grep -qx "$ACTIVE_CTR"; then
    echo "==> Migrando cobranca-app-1 → ${ACTIVE_CTR}"
    docker rename cobranca-app-1 "$ACTIVE_CTR" 2>/dev/null || true
  fi
fi

# Se ainda não há slot ativo rodando, sobe o ACTIVE primeiro (bootstrap)
if ! docker ps --format '{{.Names}}' | grep -qx "$ACTIVE_CTR"; then
  echo "==> Bootstrap: subindo slot ativo ${ACTIVE}"
  DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-0}" docker compose --env-file .env.production --profile "$ACTIVE" build "$ACTIVE_SERVICE"
  docker compose --env-file .env.production --profile "$ACTIVE" up -d --no-deps "$ACTIVE_SERVICE"
  printf 'reverse_proxy app_%s:3000\n' "$ACTIVE" > runtime/upstream
  docker compose --env-file .env.production exec -T caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1 \
    || docker compose --env-file .env.production up -d --force-recreate caddy
fi

echo "==> Build ${NEXT_SERVICE} (site atual permanece no ar)"
DOCKER_BUILDKIT="${DOCKER_BUILDKIT:-0}" docker compose --env-file .env.production --profile "$NEXT" build "$NEXT_SERVICE"

echo "==> Subindo ${NEXT_CTR} em paralelo"
docker compose --env-file .env.production --profile "$NEXT" up -d --no-deps --force-recreate "$NEXT_SERVICE"

wait_healthy() {
  local ctr="$1"
  local i status
  for i in $(seq 1 60); do
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$ctr" 2>/dev/null || echo missing)"
    if [[ "$status" == "healthy" ]]; then
      return 0
    fi
    if docker exec "$ctr" node -e "fetch('http://127.0.0.1:3000/login').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
      return 0
    fi
    sleep 3
  done
  return 1
}

echo "==> Healthcheck ${NEXT_CTR}"
if ! wait_healthy "$NEXT_CTR"; then
  echo "ERROR: ${NEXT_CTR} não saudável — mantendo ${ACTIVE} no ar" >&2
  docker logs --tail=80 "$NEXT_CTR" || true
  docker compose --env-file .env.production --profile "$NEXT" stop "$NEXT_SERVICE" || true
  docker compose --env-file .env.production --profile "$NEXT" rm -f "$NEXT_SERVICE" || true
  exit 1
fi

echo "==> Troca de tráfego Caddy → app_${NEXT}:3000"
printf 'reverse_proxy app_%s:3000\n' "$NEXT" > runtime/upstream
if ! docker compose --env-file .env.production exec -T caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1; then
  docker compose --env-file .env.production up -d --no-deps --force-recreate caddy
fi

sleep 1
if ! docker exec "$NEXT_CTR" node -e "fetch('http://127.0.0.1:3000/login').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then
  echo "ERROR: pós-troca falhou — revertendo para ${ACTIVE}" >&2
  printf 'reverse_proxy app_%s:3000\n' "$ACTIVE" > runtime/upstream
  docker compose --env-file .env.production exec -T caddy caddy reload --config /etc/caddy/Caddyfile >/dev/null 2>&1 || true
  exit 1
fi

echo "$NEXT" > runtime/active-slot

echo "==> Desligando slot antigo ${ACTIVE_CTR}"
docker compose --env-file .env.production --profile "$ACTIVE" stop "$ACTIVE_SERVICE" >/dev/null 2>&1 || true
docker compose --env-file .env.production --profile "$ACTIVE" rm -f "$ACTIVE_SERVICE" >/dev/null 2>&1 || true
docker rm -f cobranca-app-1 >/dev/null 2>&1 || true

echo "==> Status"
docker ps --filter name=cobranca- --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
echo "Deploy zero-downtime OK (ativo=${NEXT})"
