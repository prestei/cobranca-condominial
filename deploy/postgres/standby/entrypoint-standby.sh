#!/bin/sh
set -eu

DATA_DIR="${PGDATA:-/var/lib/postgresql/data}"
MARKER="${DATA_DIR}/.standby_bootstrapped"

if [ ! -f "$MARKER" ]; then
  echo "[standby] bootstrap a partir de ${PRIMARY_HOST}:${PRIMARY_PORT}"
  rm -rf "${DATA_DIR:?}/"*
  export PGPASSWORD="${REPLICATION_PASSWORD}"

  until pg_isready -h "$PRIMARY_HOST" -p "$PRIMARY_PORT" -U "$REPLICATION_USER"; do
    echo "[standby] aguardando primary..."
    sleep 3
  done

  pg_basebackup \
    -h "$PRIMARY_HOST" \
    -p "$PRIMARY_PORT" \
    -U "$REPLICATION_USER" \
    -D "$DATA_DIR" \
    -Fp -Xs -P -R

  touch "$MARKER"
  echo "[standby] basebackup concluído"
fi

exec docker-entrypoint.sh postgres \
  -c hot_standby=on \
  -c shared_buffers=128MB \
  -c max_connections=50 \
  -c listen_addresses='*'
