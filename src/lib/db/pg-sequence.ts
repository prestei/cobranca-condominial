import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

type PgClient = Prisma.TransactionClient | typeof prisma;

/** Tabelas com SERIAL `id` preenchido via upsert/createMany com ID explícito. */
export const OPERATIONAL_INCREMENT_TABLES = [
  "role",
  "user",
  "condominium",
  "unit",
  "responsible_party",
  "unit_responsible_party",
  "debt",
  "import",
  "audit_log",
  "collection_assignment",
  "internal_notification",
  "notification_failure",
] as const;

export type OperationalIncrementTable = (typeof OPERATIONAL_INCREMENT_TABLES)[number];

function tableSqlName(table: OperationalIncrementTable): string {
  return table === "user" ? `"user"` : table;
}

/** Alinha a sequence SERIAL ao MAX(id) atual (evita P2002 em inserts autoincrement). */
export async function bumpPgAutoIncrementSequence(
  client: PgClient,
  table: OperationalIncrementTable,
  column = "id",
): Promise<void> {
  const tableSql = tableSqlName(table);
  const seqTable = table === "user" ? "user" : table;
  await client.$executeRawUnsafe(
    `SELECT setval(
       pg_get_serial_sequence($1, $2),
       GREATEST(COALESCE((SELECT MAX(${column}) FROM ${tableSql}), 1), 1),
       true
     )`,
    seqTable,
    column,
  );
}

export async function bumpOperationalAutoIncrementSequences(client: PgClient = prisma): Promise<void> {
  for (const table of OPERATIONAL_INCREMENT_TABLES) {
    await bumpPgAutoIncrementSequence(client, table);
  }
}
