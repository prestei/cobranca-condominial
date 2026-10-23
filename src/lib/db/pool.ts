import type { QueryResult, QueryResultRow } from "pg";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & { pgPool?: Pool };

export function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL não está configurada. Veja docs/stack.md e .env.example.");
  }
  return url;
}

export function getPool(): Pool {
  if (!globalForDb.pgPool) {
    globalForDb.pgPool = new Pool({ connectionString: getDatabaseUrl() });
  }
  return globalForDb.pgPool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}
