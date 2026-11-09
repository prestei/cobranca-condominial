import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | null = null;

export function databaseUrlConfigurada(): string | null {
  const url = process.env.DATABASE_URL?.trim();
  return url || null;
}

export function obterPoolPg(): Pool | null {
  if (typeof window !== "undefined") return null;
  const url = databaseUrlConfigurada();
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: 8,
      idleTimeoutMillis: 20_000,
    });
    pool.on("error", (error) => {
      console.error("[pg] erro inesperado no pool:", error);
    });
  }
  return pool;
}

export async function queryPg<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T> | null> {
  const clientPool = obterPoolPg();
  if (!clientPool) return null;
  return clientPool.query<T>(text, params);
}

export async function comTransacaoPg<T>(fn: (client: PoolClient) => Promise<T>): Promise<T | null> {
  const clientPool = obterPoolPg();
  if (!clientPool) return null;
  const client = await clientPool.connect();
  try {
    await client.query("BEGIN");
    const resultado = await fn(client);
    await client.query("COMMIT");
    return resultado;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore
    }
    throw error;
  } finally {
    client.release();
  }
}
