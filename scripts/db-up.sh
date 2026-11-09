#!/usr/bin/env bash
# Este projeto não usa Docker.
# Suba um PostgreSQL nativo (apt/brew/cloud) e configure DATABASE_URL no .env.
set -euo pipefail
echo "Docker foi removido do projeto."
echo "1) Instale PostgreSQL no host ou use um banco managed"
echo "2) Crie o banco/usuário e defina DATABASE_URL no .env"
echo "3) Rode: npm run db:migrate"
exit 1
