import type { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db/prisma";
import { decimalFromString } from "@/lib/db/mappers";

function money(value: Decimal | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value.toFixed(2);
}

export type VinculoNegociacaoDebito = {
  id: number;
  proposalId: string;
  debtId: number;
  valorOriginalRegistrado: string;
  valorNegociadoAlocado: string;
  descontoConcedido: string;
  valorPagoConfirmado: string;
  saldoRestante: string;
  formalizadoEm: string;
  formalizadoPorId: number | null;
};

function mapLink(row: {
  id: number;
  proposalId: string;
  debtId: number;
  registeredOriginalAmount: { toString(): string } | null;
  allocatedNegotiatedAmount: { toString(): string } | null;
  grantedDiscount: { toString(): string } | null;
  confirmedPaidAmount: { toString(): string };
  remainingBalance: { toString(): string } | null;
  formalizedAt: Date | null;
  formalizedByUserId: number | null;
}): VinculoNegociacaoDebito {
  return {
    id: row.id,
    proposalId: row.proposalId,
    debtId: row.debtId,
    valorOriginalRegistrado: money(row.registeredOriginalAmount),
    valorNegociadoAlocado: money(row.allocatedNegotiatedAmount),
    descontoConcedido: money(row.grantedDiscount),
    valorPagoConfirmado: money(row.confirmedPaidAmount) || "0.00",
    saldoRestante: money(row.remainingBalance),
    formalizadoEm: row.formalizedAt ? row.formalizedAt.toISOString() : "",
    formalizadoPorId: row.formalizedByUserId,
  };
}

export async function listProposalDebtLinksByProposal(proposalId: string): Promise<VinculoNegociacaoDebito[]> {
  const rows = await prisma.negotiationProposalDebt.findMany({
    where: { proposalId },
    orderBy: { debtId: "asc" },
  });
  return rows.map(mapLink);
}

export async function listFormalizedProposalDebtLinksByDebtIds(debtIds: number[]): Promise<VinculoNegociacaoDebito[]> {
  if (debtIds.length === 0) return [];
  const rows = await prisma.negotiationProposalDebt.findMany({
    where: {
      debtId: { in: debtIds },
      formalizedAt: { not: null },
    },
    orderBy: [{ formalizedAt: "desc" }, { id: "desc" }],
  });
  return rows.map(mapLink);
}

export async function updateProposalDebtFinancial(
  linkId: number,
  data: {
    valorOriginalRegistrado: string;
    valorNegociadoAlocado: string;
    descontoConcedido: string;
    valorPagoConfirmado: string;
    saldoRestante: string;
    formalizadoEm: string;
    formalizadoPorId: number | null;
  },
): Promise<VinculoNegociacaoDebito> {
  const row = await prisma.negotiationProposalDebt.update({
    where: { id: linkId },
    data: {
      registeredOriginalAmount: decimalFromString(data.valorOriginalRegistrado),
      allocatedNegotiatedAmount: decimalFromString(data.valorNegociadoAlocado),
      grantedDiscount: decimalFromString(data.descontoConcedido),
      confirmedPaidAmount: decimalFromString(data.valorPagoConfirmado) ?? 0,
      remainingBalance: decimalFromString(data.saldoRestante),
      formalizedAt: data.formalizadoEm ? new Date(data.formalizadoEm) : null,
      formalizedByUserId: data.formalizadoPorId,
    },
  });
  return mapLink(row);
}

export async function recordProposalDebtFinancialChange(input: {
  linkId: number;
  debtId: number;
  proposalId: string;
  fieldName: string;
  previousValue: string;
  newValue: string;
  userId?: number | null;
  notes?: string;
}): Promise<void> {
  await prisma.negotiationProposalDebtFinancialChange.create({
    data: {
      linkId: input.linkId,
      debtId: input.debtId,
      proposalId: input.proposalId,
      fieldName: input.fieldName,
      previousValue: input.previousValue,
      newValue: input.newValue,
      userId: input.userId ?? null,
      notes: input.notes?.trim() || null,
    },
  });
}

export async function debtIdsComNegociacaoFormalizadaAtiva(): Promise<Set<number>> {
  const rows = await prisma.negotiationProposalDebt.findMany({
    where: { formalizedAt: { not: null } },
    select: { debtId: true, proposal: { select: { status: true } } },
  });
  const ids = new Set<number>();
  for (const row of rows) {
    if (row.proposal.status === "Aceita") ids.add(row.debtId);
  }
  return ids;
}