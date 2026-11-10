import { Debito } from "@/data/catalogo";
import { prisma } from "@/lib/db/prisma";
import {
  dateFromIsoDate,
  decimalFromString,
  mapDebtToDebito,
} from "@/lib/db/mappers";

function texto(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function debitoToData(item: Debito) {
  const atualizadoEm = item.atualizadoEm?.trim()
    ? new Date(item.atualizadoEm)
    : null;
  return {
    id: item.id,
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

export async function nextDebtId(): Promise<number> {
  const agg = await prisma.debt.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0) + 1;
}

export async function createDebt(item: Debito): Promise<Debito> {
  const row = await prisma.debt.create({ data: debitoToData(item) });
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
