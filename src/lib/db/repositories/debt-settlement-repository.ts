import { prisma } from "@/lib/db/prisma";
import { decimalFromString } from "@/lib/db/mappers";

export type RegistroQuitacaoDebito = {
  debtId: number;
  unitId: number;
  settledAt: string;
  paidAmount: string;
  proposalId?: string | null;
  confirmedByUserId?: number | null;
  unitSituationBefore?: string | null;
  unitSituationAfter?: string | null;
  source: string;
  notes?: string | null;
};

export async function findSettlementByDebtId(debtId: number): Promise<RegistroQuitacaoDebito | null> {
  const row = await prisma.debtSettlement.findFirst({
    where: { debtId },
    orderBy: { settledAt: "desc" },
  });
  if (!row) return null;
  return {
    debtId: row.debtId,
    unitId: row.unitId,
    settledAt: row.settledAt.toISOString(),
    paidAmount: row.paidAmount.toFixed(2),
    proposalId: row.proposalId,
    confirmedByUserId: row.confirmedByUserId,
    unitSituationBefore: row.unitSituationBefore,
    unitSituationAfter: row.unitSituationAfter,
    source: row.source,
    notes: row.notes,
  };
}

export async function listSettlementsByUnit(unitId: number): Promise<RegistroQuitacaoDebito[]> {
  const rows = await prisma.debtSettlement.findMany({
    where: { unitId },
    orderBy: { settledAt: "asc" },
  });
  return rows.map((row) => ({
    debtId: row.debtId,
    unitId: row.unitId,
    settledAt: row.settledAt.toISOString(),
    paidAmount: row.paidAmount.toFixed(2),
    proposalId: row.proposalId,
    confirmedByUserId: row.confirmedByUserId,
    unitSituationBefore: row.unitSituationBefore,
    unitSituationAfter: row.unitSituationAfter,
    source: row.source,
    notes: row.notes,
  }));
}

export async function createDebtSettlement(registro: RegistroQuitacaoDebito): Promise<void> {
  await prisma.debtSettlement.create({
    data: {
      debtId: registro.debtId,
      unitId: registro.unitId,
      settledAt: new Date(registro.settledAt),
      paidAmount: decimalFromString(registro.paidAmount) ?? 0,
      proposalId: registro.proposalId ?? null,
      confirmedByUserId: registro.confirmedByUserId ?? null,
      unitSituationBefore: registro.unitSituationBefore ?? null,
      unitSituationAfter: registro.unitSituationAfter ?? null,
      source: registro.source,
      notes: registro.notes ?? null,
    },
  });
}