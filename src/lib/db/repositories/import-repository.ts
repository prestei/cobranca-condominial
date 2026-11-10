import { Importacao } from "@/data/catalogo";
import { prisma } from "@/lib/db/prisma";
import { dateFromIsoDateTime, mapImportToImportacao } from "@/lib/db/mappers";

function texto(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function intOuNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function importacaoToData(item: Importacao) {
  return {
    id: item.id,
    processId: texto(item.processoId),
    origin: texto(item.origem),
    type: item.tipo,
    fileName: texto(item.arquivo),
    status: item.status,
    recordCount: intOuNull(item.quantidadeRegistros),
    importedCount: intOuNull(item.quantidadeImportados),
    updatedCount: intOuNull(item.quantidadeAtualizados),
    ignoredCount: intOuNull(item.quantidadeIgnorados),
    errorCount: intOuNull(item.quantidadeErros),
    internalNotes: texto(item.observacaoInterna),
    userId: item.usuarioId,
    startedAt: item.iniciadoEm ? dateFromIsoDateTime(item.iniciadoEm) : null,
    approvalUserId: item.usuarioAprovacaoId,
    approvedAt: item.aprovadoEm ? dateFromIsoDateTime(item.aprovadoEm) : null,
    importedAt: dateFromIsoDateTime(item.dataImportacao) ?? new Date(),
  };
}

export async function listImports(): Promise<Importacao[]> {
  const rows = await prisma.import.findMany({ orderBy: { id: "asc" } });
  return rows.map(mapImportToImportacao);
}

export async function findImportById(id: number): Promise<Importacao | null> {
  const row = await prisma.import.findUnique({ where: { id } });
  return row ? mapImportToImportacao(row) : null;
}

export async function nextImportId(): Promise<number> {
  const agg = await prisma.import.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0) + 1;
}

export async function createImport(item: Importacao): Promise<Importacao> {
  const row = await prisma.import.create({ data: importacaoToData(item) });
  return mapImportToImportacao(row);
}

export async function updateImport(item: Importacao): Promise<Importacao> {
  const data = importacaoToData(item);
  const row = await prisma.import.update({
    where: { id: item.id },
    data: { ...data, id: undefined },
  });
  return mapImportToImportacao(row);
}

/** Grava ou atualiza rascunho / etapa intermediária do fluxo de importação (fora do save em massa na confirmação). */
export async function upsertImport(item: Importacao): Promise<Importacao> {
  const data = importacaoToData(item);
  const row = await prisma.import.upsert({
    where: { id: item.id },
    create: data,
    update: { ...data, id: undefined },
  });
  return mapImportToImportacao(row);
}

export async function deleteImport(id: number): Promise<void> {
  await prisma.import.delete({ where: { id } });
}
