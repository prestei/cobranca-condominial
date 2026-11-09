#!/usr/bin/env bash
# Bootstrap na VPS limpa: Node, Caddy, PostgreSQL, firewall, systemd — sem Docker.
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/cobranca-condominial}"
DOMAIN="${DOMAIN:-danieljorgeadv.com}"
INSTALL_LOCAL_POSTGRES="${INSTALL_LOCAL_POSTGRES:-1}"
ENV_FILE="${APP_DIR}/deploy/.env.production"

log() { echo "==> $*"; }

load_env() {
  if [[ -f "$ENV_FILE" ]]; then
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
  fi
}

install_base() {
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -y
  apt-get install -y curl git ufw openssl ca-certificates gnupg rsync build-essential
}

install_node() {
  if command -v node >/dev/null 2>&1; then
    log "Node já instalado: $(node -v)"
    return
  fi
  log "Instalando Node.js 22 (NodeSource)"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
  node -v
  npm -v
}

install_caddy() {
  if command -v caddy >/dev/null 2>&1; then
    log "Caddy já instalado"
    return
  fi
  log "Instalando Caddy"
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
    | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
    | tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
  apt-get update -y
  apt-get install -y caddy
}

install_postgres() {
  if [[ "$INSTALL_LOCAL_POSTGRES" != "1" ]]; then
    log "PostgreSQL local desligado (INSTALL_LOCAL_POSTGRES=0)"
    return
  fi

  if ! command -v psql >/dev/null 2>&1; then
    log "Instalando PostgreSQL"
    apt-get install -y postgresql postgresql-contrib
  else
    log "PostgreSQL já instalado"
  fi
  systemctl enable --now postgresql

  local db_name="${POSTGRES_DB:-cobranca_condominial}"
  local db_user="${POSTGRES_USER:-cobranca}"
  local db_pass="${POSTGRES_PASSWORD:-}"

  if [[ -z "$db_pass" ]]; then
    die "POSTGRES_PASSWORD ausente em deploy/.env.production"
  fi

  log "Garantindo role/banco ${db_user}/${db_name}"
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${db_user}') THEN
    CREATE ROLE ${db_user} LOGIN PASSWORD '${db_pass}';
  ELSE
    ALTER ROLE ${db_user} WITH LOGIN PASSWORD '${db_pass}';
  END IF;
END
\$\$;
SQL

  if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${db_name}'" | grep -q 1; then
    sudo -u postgres createdb -O "${db_user}" "${db_name}"
  fi

  # Acesso local via senha (app em 127.0.0.1)
  local pg_hba
  pg_hba="$(sudo -u postgres psql -tAc 'SHOW hba_file')"
  if [[ -n "$pg_hba" && -f "$pg_hba" ]]; then
    if ! grep -q "cobranca-app-local" "$pg_hba"; then
      echo "# cobranca-app-local" >>"$pg_hba"
      echo "host    ${db_name}    ${db_user}    127.0.0.1/32    scram-sha-256" >>"$pg_hba"
      echo "host    ${db_name}    ${db_user}    ::1/128         scram-sha-256" >>"$pg_hba"
      systemctl reload postgresql || systemctl restart postgresql
    fi
  fi
}

configure_firewall() {
  log "Firewall UFW (22/80/443)"
  ufw allow OpenSSH >/dev/null 2>&1 || ufw allow 22/tcp >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ufw --force enable >/dev/null 2>&1 || true
}

configure_caddy() {
  local email="${ACME_EMAIL:-admin@${DOMAIN}}"
  log "Configurando Caddy para ${DOMAIN}"
  mkdir -p /etc/caddy
  cat > /etc/caddy/Caddyfile <<EOF
{
  email ${email}
}

${DOMAIN}, www.${DOMAIN} {
  encode gzip zstd
  reverse_proxy 127.0.0.1:3000

  header {
    Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
    X-Content-Type-Options nosniff
    X-Frame-Options DENY
    Referrer-Policy strict-origin-when-cross-origin
    -Server
  }
}

# Acesso direto pelo IP enquanto o DNS não propaga (HTTP)
:80 {
  reverse_proxy 127.0.0.1:3000
}
EOF
  systemctl enable --now caddy
  systemctl reload caddy || systemctl restart caddy
}

install_app_unit() {
  log "Instalando unit systemd cobranca-app"
  id -u cobranca >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin cobranca
  mkdir -p "$APP_DIR"
  chown -R cobranca:cobranca "$APP_DIR" || true

  install -m 644 "$APP_DIR/deploy/systemd/cobranca-app.service" /etc/systemd/system/cobranca-app.service
  sed -i 's/^User=.*/User=cobranca/' /etc/systemd/system/cobranca-app.service
  sed -i 's/^Group=.*/Group=cobranca/' /etc/systemd/system/cobranca-app.service
  # Node/npm costumam estar em /usr/bin após NodeSource
  if [[ -x /usr/bin/npm ]]; then
    sed -i 's|^ExecStart=.*|ExecStart=/usr/bin/npm run start -- --hostname 127.0.0.1 --port 3000|' \
      /etc/systemd/system/cobranca-app.service
  fi
  systemctl daemon-reload
  systemctl enable cobranca-app.service >/dev/null 2>&1 || true
}

die() { echo "ERROR: $*" >&2; exit 1; }

main() {
  load_env
  install_base
  install_node
  install_caddy
  install_postgres
  configure_firewall
  configure_caddy
  install_app_unit
  log "Bootstrap concluído"
}

main "$@"
