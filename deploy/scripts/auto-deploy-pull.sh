#!/usr/bin/env bash
# Poll na VPS: se main avançou no GitHub, puxa e faz deploy.
# Instalado como systemd timer (deploy automático).
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cobranca-condominial}"
BRANCH="${DEPLOY_BRANCH:-main}"
REMOTE="${DEPLOY_REMOTE:-origin}"
LOCK="/var/lock/cobranca-auto-deploy.lock"
LOG_TAG="cobranca-auto-deploy"

exec 9>"$LOCK"
if ! flock -n 9; then
  logger -t "$LOG_TAG" "já em execução — ignorando"
  exit 0
fi

cd "$APP_DIR"
export HOME="${HOME:-/root}"
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
# Garante safe.directory mesmo sem HOME no systemd
GIT_SAFE=(git -c "safe.directory=${APP_DIR}")

if [[ ! -d .git ]]; then
  logger -t "$LOG_TAG" "sem .git em ${APP_DIR} — abortando"
  exit 1
fi

# Preserva env de produção fora do tracking
ENV_FILE="deploy/.env.production"
ENV_BACKUP=""
if [[ -f "$ENV_FILE" ]]; then
  ENV_BACKUP="$(mktemp)"
  cp -a "$ENV_FILE" "$ENV_BACKUP"
fi

"${GIT_SAFE[@]}" fetch --prune "$REMOTE" "$BRANCH"
LOCAL=$("${GIT_SAFE[@]}" rev-parse HEAD)
REMOTE_SHA=$("${GIT_SAFE[@]}" rev-parse "refs/remotes/${REMOTE}/${BRANCH}")

if [[ "$LOCAL" == "$REMOTE_SHA" ]]; then
  exit 0
fi

logger -t "$LOG_TAG" "atualizando ${LOCAL:0:7} → ${REMOTE_SHA:0:7}"
"${GIT_SAFE[@]}" reset --hard "refs/remotes/${REMOTE}/${BRANCH}"

if [[ -n "$ENV_BACKUP" && -f "$ENV_BACKUP" ]]; then
  mkdir -p deploy
  cp -a "$ENV_BACKUP" "$ENV_FILE"
  chmod 600 "$ENV_FILE"
  rm -f "$ENV_BACKUP"
fi

chmod +x deploy/scripts/*.sh 2>/dev/null || true
APP_DIR="$APP_DIR" bash deploy/scripts/ci-remote-deploy.sh
logger -t "$LOG_TAG" "deploy concluído ${REMOTE_SHA:0:7}"
