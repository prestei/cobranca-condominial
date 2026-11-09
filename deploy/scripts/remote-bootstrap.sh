#!/usr/bin/env bash
# Executa NA VPS. Idempotente: pode rodar em máquina limpa ou já provisionada.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

APP_DIR="${APP_DIR:-/opt/cobranca-condominial}"
DOMAIN="${DOMAIN:-danieljorgeadv.com}"
SWAP_MB="${SWAP_MB:-4096}"

log() { printf '\n==> %s\n' "$*"; }

need_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    echo "Execute como root." >&2
    exit 1
  fi
}

ensure_swap() {
  if swapon --show | grep -q .; then
    log "Swap já ativo"
    return
  fi
  if [[ -f /swapfile ]]; then
    swapon /swapfile || true
    return
  fi
  log "Criando swap ${SWAP_MB}MB (VPS com pouca RAM)"
  fallocate -l "${SWAP_MB}M" /swapfile || dd if=/dev/zero of=/swapfile bs=1M count="${SWAP_MB}"
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  if ! grep -q '^/swapfile ' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  fi
}

install_docker() {
  export DEBIAN_FRONTEND=noninteractive
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log "Docker já instalado: $(docker --version)"
    return
  fi
  log "Instalando Docker (pacotes Ubuntu: docker.io + compose)"
  apt-get update -y
  apt-get install -y ca-certificates curl gnupg docker.io docker-compose-v2 \
    || apt-get install -y docker.io docker-compose
  systemctl enable --now docker
  docker --version
  docker compose version
}

wait_apt() {
  local i
  for i in $(seq 1 60); do
    if ! fuser /var/lib/dpkg/lock-frontend >/dev/null 2>&1 \
      && ! fuser /var/lib/dpkg/lock >/dev/null 2>&1; then
      return 0
    fi
    log "Aguardando apt/dpkg (unattended-upgrades?)… ${i}/60"
    sleep 5
  done
  return 1
}

configure_firewall() {
  log "Configurando UFW (22, 80, 443, 5432)"
  wait_apt || true
  apt-get install -y ufw
  ufw allow OpenSSH
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw allow 443/udp
  # Postgres só necessário quando o standby existir — deixe aberto por enquanto
  ufw allow 5432/tcp comment 'postgres replication'
  ufw --force enable
}

ensure_env() {
  local envf="${APP_DIR}/deploy/.env.production"
  if [[ ! -f "$envf" ]]; then
    echo "Arquivo ausente: ${envf}" >&2
    echo "Gere a partir de deploy/env.example antes do bootstrap." >&2
    exit 1
  fi
  # shellcheck disable=SC1090
  set -a; source "$envf"; set +a
  if [[ -z "${AUTH_SECRET:-}" || ${#AUTH_SECRET} -lt 32 ]]; then
    echo "AUTH_SECRET inválido em .env.production (mín. 32 chars)" >&2
    exit 1
  fi
  if [[ -z "${POSTGRES_PASSWORD:-}" || -z "${REPLICATION_PASSWORD:-}" ]]; then
    echo "POSTGRES_PASSWORD e REPLICATION_PASSWORD são obrigatórios" >&2
    exit 1
  fi
}

start_stack() {
  log "Subindo stack (blue/green) em ${APP_DIR}"
  chmod +x "${APP_DIR}/deploy/scripts/"*.sh || true
  # Deploy zero-downtime: build no slot inativo, troca Caddy, derruba o antigo
  APP_DIR="${APP_DIR}" bash "${APP_DIR}/deploy/scripts/ci-remote-deploy.sh"
}

wait_healthy() {
  log "Validando site"
  local i
  for i in $(seq 1 30); do
    if curl -fsSk "https://${DOMAIN}/login" >/dev/null 2>&1 \
      || curl -fsS -H "Host: ${DOMAIN}" "http://127.0.0.1/login" >/dev/null 2>&1; then
      log "Stack responsiva"
      return 0
    fi
    sleep 3
  done
  log "Aviso: healthcheck lento — docker ps / logs caddy"
  docker ps --filter name=cobranca- || true
}

print_dns_hint() {
  local ip
  ip="$(curl -4 -fsS https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')"
  cat <<EOF

--------------------------------------------
Domínio: ${DOMAIN}
IP desta VPS: ${ip}

Para o SSL Let's Encrypt funcionar, o DNS deve apontar:
  A     ${DOMAIN}      -> ${ip}
  A     www.${DOMAIN}  -> ${ip}
  (ou CNAME www -> ${DOMAIN})

Estado atual: se o domínio ainda aponta para parking/CDN,
o Caddy fica em HTTP até o DNS propagar e emite o certificado
automaticamente depois.
--------------------------------------------
EOF
}

main() {
  need_root
  ensure_swap
  install_docker
  configure_firewall
  ensure_env
  start_stack
  wait_healthy
  print_dns_hint
  log "Bootstrap concluído"
}

main "$@"
