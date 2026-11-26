#!/usr/bin/env bash
# Atualiza o código na VPS via git (clone, fetch + reset). Preserva deploy/.env.production.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cobranca-condominial}"
BRANCH="${DEPLOY_BRANCH:-main}"
REMOTE_NAME="${DEPLOY_REMOTE:-origin}"
REMOTE_URL="${REMOTE_URL:-https://github.com/prestei/cobranca-condominial.git}"

log() { echo "==> $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

if [[ -z "$REMOTE_URL" ]]; then
  die "REMOTE_URL obrigatório"
fi

# Repo privado: passe GITHUB_DEPLOY_TOKEN (read-only) no ambiente do comando.
if [[ -n "${GITHUB_DEPLOY_TOKEN:-}" ]] && [[ "$REMOTE_URL" == https://github.com/* ]]; then
  REMOTE_URL="https://${GITHUB_DEPLOY_TOKEN}@github.com/${REMOTE_URL#https://github.com/}"
fi

git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
export HOME="${HOME:-/root}"
GIT=(git -c "safe.directory=${APP_DIR}")

ENV_FILE="${APP_DIR}/deploy/.env.production"
ENV_BACKUP=""
RUNTIME_BACKUP=""

backup_local_state() {
  if [[ -f "$ENV_FILE" ]]; then
    ENV_BACKUP="$(mktemp)"
    cp -a "$ENV_FILE" "$ENV_BACKUP"
  fi
  if [[ -d "${APP_DIR}/deploy/runtime" ]]; then
    RUNTIME_BACKUP="$(mktemp -d)"
    cp -a "${APP_DIR}/deploy/runtime/." "$RUNTIME_BACKUP/" || true
  fi
}

restore_local_state() {
  if [[ -n "$ENV_BACKUP" && -f "$ENV_BACKUP" ]]; then
    mkdir -p "${APP_DIR}/deploy"
    cp -a "$ENV_BACKUP" "$ENV_FILE"
    chmod 600 "$ENV_FILE"
    rm -f "$ENV_BACKUP"
  fi
  if [[ -n "$RUNTIME_BACKUP" && -d "$RUNTIME_BACKUP" ]]; then
    mkdir -p "${APP_DIR}/deploy/runtime"
    cp -a "$RUNTIME_BACKUP"/. "${APP_DIR}/deploy/runtime/"
    rm -rf "$RUNTIME_BACKUP"
  fi
}

sync_tree() {
  backup_local_state
  cd "$APP_DIR"
  "${GIT[@]}" fetch --prune "$REMOTE_NAME" "$BRANCH"
  "${GIT[@]}" reset --hard "${REMOTE_NAME}/${BRANCH}"
  "${GIT[@]}" clean -fdx
  restore_local_state
}

mkdir -p "$APP_DIR"

if [[ ! -d "${APP_DIR}/.git" ]]; then
  log "Git: primeiro checkout (${BRANCH}) em ${APP_DIR}"
  backup_local_state
  if [[ -z "$(find "$APP_DIR" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null)" ]]; then
    "${GIT[@]}" clone --branch "$BRANCH" --single-branch "$REMOTE_URL" "$APP_DIR"
  else
    cd "$APP_DIR"
    "${GIT[@]}" init -b "$BRANCH"
    "${GIT[@]}" remote add "$REMOTE_NAME" "$REMOTE_URL" 2>/dev/null \
      || "${GIT[@]}" remote set-url "$REMOTE_NAME" "$REMOTE_URL"
    "${GIT[@]}" fetch --prune "$REMOTE_NAME" "$BRANCH"
    "${GIT[@]}" reset --hard "${REMOTE_NAME}/${BRANCH}"
    "${GIT[@]}" clean -fdx
  fi
  restore_local_state
else
  log "Git: atualizando ${BRANCH} em ${APP_DIR}"
  cd "$APP_DIR"
  "${GIT[@]}" remote set-url "$REMOTE_NAME" "$REMOTE_URL" 2>/dev/null \
    || "${GIT[@]}" remote add "$REMOTE_NAME" "$REMOTE_URL"
  sync_tree
fi

chmod +x "${APP_DIR}/deploy/scripts/"*.sh 2>/dev/null || true
log "Git sync concluído ($("${GIT[@]}" -C "$APP_DIR" rev-parse --short HEAD))"