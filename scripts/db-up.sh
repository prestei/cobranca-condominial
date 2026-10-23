#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

run_compose() {
  if docker info >/dev/null 2>&1; then
    docker compose up -d db
    return
  fi
  if sudo -n docker info >/dev/null 2>&1; then
    sudo docker compose up -d db
    return
  fi
  echo "Erro: sem acesso ao Docker."
  echo "  Opção A: sudo usermod -aG docker \"\$USER\" && newgrp docker"
  echo "  Opção B: sudo docker compose up -d db   (nesta pasta)"
  exit 1
}

run_compose

echo "Aguardando PostgreSQL..."
for _ in $(seq 1 30); do
  if command -v pg_isready >/dev/null 2>&1 && pg_isready -h localhost -p 5433 -U cobranca -d cobranca_condominial >/dev/null 2>&1; then
    echo "PostgreSQL pronto em localhost:5433 (banco cobranca_condominial)."
    exit 0
  fi
  sleep 1
done

echo "Container iniciado; pg_isready ainda não respondeu. Verifique: npm run db:logs"
exit 0
