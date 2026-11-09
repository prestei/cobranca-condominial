#!/usr/bin/env bash
# Bootstrap na VPS: Node.js, Caddy, PostgreSQL local ou remoto, systemd — sem Docker.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cobranca-condominial}"
DOMAIN="${DOMAIN:-danieljorgeadv.com}"

log() { echo "==> $*"; }

install_node() {
  if command -v node >/dev/null 2>&1; then
    log "Node já instalado: $(node -v)"
    return
  fi
  log "Instalando Node.js 22 (NodeSource)"
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
}

install_caddy() {
  if command -v caddy >/dev/null 2>&1; then
    log "Caddy já instalado"
    return
  fi
  log "Instalando Caddy"
  apt-get update -y
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
}

install_postgres_optional() {
  if [[ "${INSTALL_LOCAL_POSTGRES:-0}" != "1" ]]; then
    log "Pulando Postgres local (use DATABASE_URL apontando para seu banco). Para instalar: INSTALL_LOCAL_POSTGRES=1"
    return
  fi
  if command -v psql >/dev/null 2>&1; then
    log "PostgreSQL já instalado"
    return
  fi
  log "Instalando PostgreSQL"
  apt-get update -y
  apt-get install -y postgresql postgresql-contrib
  systemctl enable --now postgresql
}

configure_caddy() {
  log "Configurando Caddy para ${DOMAIN}"
  mkdir -p /etc/caddy
  cat > /etc/caddy/Caddyfile <<EOF
${DOMAIN}, www.${DOMAIN} {
  encode gzip
  reverse_proxy 127.0.0.1:3000
}
EOF
  systemctl enable --now caddy
  systemctl reload caddy || systemctl restart caddy
}

install_app_unit() {
  log "Instalando unit systemd cobranca-app"
  install -m 644 "$APP_DIR/deploy/systemd/cobranca-app.service" /etc/systemd/system/cobranca-app.service
  # App costuma rodar como root ou usuário dedicado; www-data precisa de permissão no diretório.
  id -u cobranca >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin cobranca
  chown -R cobranca:cobranca "$APP_DIR" || true
  sed -i 's/^User=.*/User=cobranca/' /etc/systemd/system/cobranca-app.service
  sed -i 's/^Group=.*/Group=cobranca/' /etc/systemd/system/cobranca-app.service
  systemctl daemon-reload
}

main() {
  apt-get update -y
  apt-get install -y curl git ufw openssl
  install_node
  install_caddy
  install_postgres_optional
  configure_caddy
  install_app_unit
  log "Bootstrap concluído. Configure deploy/.env.production e rode: bash deploy/scripts/ci-remote-deploy.sh"
}

main "$@"
