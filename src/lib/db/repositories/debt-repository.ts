import { Debito } from "@/data/catalogo";
import { prisma } from "@/lib/db/prisma";
import {
  dateFromIsoDate,
  decimalFromString,
  mapDebtToDebito,
} from "@/lib/db/mappers";
import { retryCreateAfterIdSequenceBump } from "@/lib/db/repositories/prisma-insert-retry";

function texto(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function debitoPersistFields(item: Omit<Debito, "id">) {
  const atualizadoEm = item.atualizadoEm?.trim()
    ? new Date(item.atualizadoEm)
    : null;
  return {
    condominiumId: item.condominioId,
    unitId: item.unidadeId,
    reference: item.referencia,
    description: texto(item.descricao),
    dueDate: dateFromIsoDate(item.dataVencimento) ?? new Date(),
    amount: decimalFromString(item.valor),
    originalAmount: decimalFromString(item.valorOriginal),
    fine: decimalFromString(item.multa),
    interest: decimalFromString(item.juros),
    correction: decimalFromString(item.correcao),
    updatedAmount: decimalFromString(item.valorAtualizado),
    status: item.status,
    paymentDate: dateFromIsoDate(item.dataPagamento),
    paidAmount: decimalFromString(item.valorPago),
    origin: texto(item.origem),
    externalId: texto(item.identificadorExterno),
    updatedAt: atualizadoEm,
    valueSource: item.fonteValores === "manual" ? "manual" : "origem",
  };
}

function debitoToData(item: Debito) {
  return { id: item.id, ...debitoPersistFields(item) };
}

export async function listDebts(): Promise<Debito[]> {
  const rows = await prisma.debt.findMany({ orderBy: { id: "asc" } });
  return rows.map(mapDebtToDebito);
}

export async function listDebtsByUnit(unitId: number): Promise<Debito[]> {
  const rows = await prisma.debt.findMany({
    where: { unitId },
    orderBy: { id: "asc" },
  });
  return rows.map(mapDebtToDebito);
}

export async function listDebtsByCondominium(condominiumId: number): Promise<Debito[]> {
  const rows = await prisma.debt.findMany({
    where: { condominiumId },
    orderBy: { id: "asc" },
  });
  return rows.map(mapDebtToDebito);
}

export async function findDebtById(id: number): Promise<Debito | null> {
  const row = await prisma.debt.findUnique({ where: { id } });
  return row ? mapDebtToDebito(row) : null;
}

export async function createDebt(item: Omit<Debito, "id">): Promise<Debito> {
  const data = debitoPersistFields(item);
  const row = await retryCreateAfterIdSequenceBump("debt", () => prisma.debt.create({ data }));
  return mapDebtToDebito(row);
}

export async function updateDebt(item: Debito): Promise<Debito> {
  const { id: _id, ...data } = debitoToData(item);
  const row = await prisma.debt.update({
    where: { id: item.id },
    data,
  });
  return mapDebtToDebito(row);
}

export async function deleteDebt(id: number): Promise<void> {
  await prisma.debt.delete({ where: { id } });
}
