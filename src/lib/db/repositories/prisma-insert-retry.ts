import { bumpPgAutoIncrementSequence, type OperationalIncrementTable } from "@/lib/db/pg-sequence";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

function targets(error: Prisma.PrismaClientKnownRequestError): string[] {
  const meta = error.meta?.target;
  return Array.isArray(meta) ? (meta as string[]) : [];
}

export function isPrismaUniqueOnField(error: unknown, field: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    targets(error).includes(field)
  );
}

/** Reinsere após alinhar a sequence quando o SERIAL ficou atrás do MAX(id) após seed/upsert. */
export async function retryCreateAfterIdSequenceBump<T>(
  table: OperationalIncrementTable,
  create: () => Promise<T>,
): Promise<T> {
  try {
    return await create();
  } catch (error) {
    if (!isPrismaUniqueOnField(error, "id")) throw error;
    await bumpPgAutoIncrementSequence(prisma, table);
    return await create();
  }
}
