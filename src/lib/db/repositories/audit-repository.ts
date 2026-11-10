import { Auditoria } from "@/data/catalogo";
import { prisma } from "@/lib/db/prisma";
import { mapAuditToAuditoria } from "@/lib/db/mappers";

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

/** Grava auditoria direto no PostgreSQL via Prisma. */
export async function writeAuditLog(input: AuditWriteInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
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
    },
  });
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
