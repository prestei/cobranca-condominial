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

function pgSerialSequenceName(table: OperationalIncrementTable): string {
  return table === "user" ? "user_id_seq" : `${table}_id_seq`;
}

/** Garante sequence + DEFAULT em ambientes legados (001_schema sem SERIAL). */
export async function ensurePgAutoIncrementSequence(
  client: PgClient,
  table: OperationalIncrementTable,
  column = "id",
): Promise<void> {
  const tableSql = tableSqlName(table);
  const seqTable = table === "user" ? "user" : table;
  const seqName = pgSerialSequenceName(table);

  const rows = await client.$queryRawUnsafe<Array<{ seq: string | null }>>(
    `SELECT pg_get_serial_sequence($1, $2) AS seq`,
    seqTable,
    column,
  );
  if (rows[0]?.seq) return;

  // Nomes vêm só de OPERATIONAL_INCREMENT_TABLES (whitelist).
  await client.$executeRawUnsafe(`CREATE SEQUENCE IF NOT EXISTS ${seqName}`);
  await client.$executeRawUnsafe(`ALTER SEQUENCE ${seqName} OWNED BY ${tableSql}.${column}`);
  await client.$executeRawUnsafe(
    `SELECT setval('${seqName}', GREATEST(COALESCE((SELECT MAX(${column}) FROM ${tableSql}), 1), 1))`,
  );
  await client.$executeRawUnsafe(
    `ALTER TABLE ${tableSql} ALTER COLUMN ${column} SET DEFAULT nextval('${seqName}')`,
  );
}

/** Alinha a sequence SERIAL ao MAX(id) atual (evita P2002 em inserts autoincrement). */
export async function bumpPgAutoIncrementSequence(
  client: PgClient,
  table: OperationalIncrementTable,
  column = "id",
): Promise<void> {
  await ensurePgAutoIncrementSequence(client, table, column);
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
