#!/bin/bash
set -euo pipefail

# Cria usuário de replicação e libera acesso do standby (REPLICA_CIDR).
# Idempotente: roda só no primeiro init do volume.

REPLICATION_USER="${REPLICATION_USER:-replicator}"
REPLICATION_PASSWORD="${REPLICATION_PASSWORD:?REPLICATION_PASSWORD obrigatória}"
REPLICA_CIDR="${REPLICA_CIDR:-0.0.0.0/0}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
	DO \$\$
	BEGIN
	  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '${REPLICATION_USER}') THEN
	    CREATE ROLE ${REPLICATION_USER} WITH REPLICATION LOGIN PASSWORD '${REPLICATION_PASSWORD}';
	  ELSE
	    ALTER ROLE ${REPLICATION_USER} WITH REPLICATION LOGIN PASSWORD '${REPLICATION_PASSWORD}';
	  END IF;
	END
	\$\$;
EOSQL

# Garante linha de replicação em pg_hba.conf
HBA="${PGDATA}/pg_hba.conf"
LINE="host replication ${REPLICATION_USER} ${REPLICA_CIDR} scram-sha-256"
if ! grep -Fqx "$LINE" "$HBA" 2>/dev/null; then
  echo "$LINE" >> "$HBA"
fi

echo "[init] replicação preparada para usuário ${REPLICATION_USER} (${REPLICA_CIDR})"
