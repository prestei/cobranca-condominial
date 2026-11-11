import { Auditoria } from "@/data/catalogo";
import { mapAuditToAuditoria } from "@/lib/db/mappers";
import { bumpPgAutoIncrementSequence } from "@/lib/db/pg-sequence";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export type AuditWriteInput = {
  entity: string;
  recordId: string;
  action: string;
  previousData?: string;
  newData?: string;
  changedFields?: string;
  userId?: number | null;
  ip?: string;
  userAgent?: string;
};

function auditLogCreateData(input: AuditWriteInput) {
  return {
    userId: input.userId ?? null,
    entity: input.entity,
    recordId: input.recordId || null,
    action: input.action,
    previousData: input.previousData?.trim() || null,
    newData: input.newData?.trim() || null,
    changedFields: input.changedFields?.trim() || null,
    ip: input.ip?.trim() || null,
    userAgent: input.userAgent?.trim() || null,
    occurredAt: new Date(),
  };
}

function isAuditLogIdUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    Array.isArray(error.meta?.target) &&
    (error.meta.target as string[]).includes("id")
  );
}

/** Grava auditoria direto no PostgreSQL via Prisma. */
export async function writeAuditLog(input: AuditWriteInput): Promise<void> {
  const data = auditLogCreateData(input);
  try {
    await prisma.auditLog.create({ data });
  } catch (error) {
    if (!isAuditLogIdUniqueViolation(error)) throw error;
    await bumpPgAutoIncrementSequence(prisma, "audit_log");
    await prisma.auditLog.create({ data });
  }
}

export type AuditListFilters = {
  entidade?: string;
  acao?: string;
  userId?: number;
};

/** Lista registros de auditoria para consulta administrativa. */
export async function listAuditLogs(filters: AuditListFilters = {}): Promise<Auditoria[]> {
  const where: Parameters<typeof prisma.auditLog.findMany>[0]["where"] = {};
  const entidade = filters.entidade?.trim();
  const acao = filters.acao?.trim();
  if (entidade && entidade !== "todas") {
    where.entity = entidade;
  }
  if (acao && acao !== "todas") {
    where.action = acao;
  }
  if (filters.userId !== undefined && Number.isFinite(filters.userId)) {
    where.userId = filters.userId;
  }
  const rows = await prisma.auditLog.findMany({
    where,
    orderBy: { occurredAt: "desc" },
  });
  return rows.map(mapAuditToAuditoria);
}
