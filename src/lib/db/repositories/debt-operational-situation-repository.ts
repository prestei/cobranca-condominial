import { agoraIso, SITUACAO_OPERACIONAL_EM_ABERTO, type Debito } from "@/data/catalogo";
import { prisma } from "@/lib/db/prisma";
import { mapDebtToDebito } from "@/lib/db/mappers";
import type { SituacaoOperacionalDebito } from "@/lib/debitos/operational-situation";

export type AlteracaoSituacaoOperacionalRegistro = {
  debtId: number;
  previousSituation: string | null;
  newSituation: string;
  userId: number | null;
  changedAt: string;
  notes?: string;
};

export async function recordDebtOperationalSituationChange(
  input: AlteracaoSituacaoOperacionalRegistro,
): Promise<void> {
  await prisma.debtOperationalSituationChange.create({
    data: {
      debtId: input.debtId,
      previousSituation: input.previousSituation,
      newSituation: input.newSituation,
      userId: input.userId,
      changedAt: input.changedAt ? new Date(input.changedAt) : new Date(),
      notes: input.notes?.trim() || null,
    },
  });
}

export async function applyDebtOperationalSituation(
  debtId: number,
  nova: SituacaoOperacionalDebito,
  userId: number | null,
  alteradoEm = agoraIso(),
): Promise<Debito> {
  const row = await prisma.debt.update({
    where: { id: debtId },
    data: {
      operationalSituation: nova,
      operationalSituationChangedAt: new Date(alteradoEm),
      operationalSituationUserId: userId,
    },
  });
  return mapDebtToDebito(row);
}

export async function listDebtOperationalSituationChanges(debtId: number) {
  const rows = await prisma.debtOperationalSituationChange.findMany({
    where: { debtId },
    orderBy: { changedAt: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    debtId: row.debtId,
    situacaoAnterior: row.previousSituation,
    situacaoNova: row.newSituation,
    usuarioId: row.userId,
    alteradoEm: row.changedAt.toISOString(),
    observacoes: row.notes ?? "",
  }));
}

export async function listDebtOperationalSituationChangesByDebtIds(debtIds: number[]) {
  if (debtIds.length === 0) return [];
  const rows = await prisma.debtOperationalSituationChange.findMany({
    where: { debtId: { in: debtIds } },
    orderBy: { changedAt: "asc" },
  });
  return rows.map((row) => ({
    id: row.id,
    debtId: row.debtId,
    situacaoAnterior: row.previousSituation,
    situacaoNova: row.newSituation,
    usuarioId: row.userId,
    alteradoEm: row.changedAt.toISOString(),
    observacoes: row.notes ?? "",
  }));
}