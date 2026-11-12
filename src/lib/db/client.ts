import { Pool, type PoolClient } from "pg";

let pool: Pool | null = null;

/** PostgreSQL desligado em testes ou quando `CATALOGO_POSTGRES=0`. */
export function postgresDisponivel(): boolean {
  if (process.env.NODE_ENV === "test") return false;
  if (process.env.CATALOGO_POSTGRES === "0") return false;
  const url = process.env.DATABASE_URL?.trim();
  return Boolean(url);
}

export function getPool(): Pool {
  if (!postgresDisponivel()) {
    throw new Error("DATABASE_URL não configurada ou PostgreSQL desativado.");
  }
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 8,
    });
    pool.on("error", (error) => {
      console.error("[db] Erro inesperado no pool PostgreSQL:", error);
    });
  }
  return pool;
}

export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
