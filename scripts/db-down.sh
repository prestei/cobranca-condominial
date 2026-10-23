#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if docker info >/dev/null 2>&1; then
  docker compose down
elif sudo -n docker info >/dev/null 2>&1; then
  sudo docker compose down
else
  echo "Sem acesso ao Docker. Tente: sudo docker compose down"
  exit 1
fi
