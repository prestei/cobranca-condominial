import { AtribuicaoCobranca } from "@/data/catalogo";
import { prisma } from "@/lib/db/prisma";
import { dateFromIsoDateTime, mapAssignmentToAtribuicao } from "@/lib/db/mappers";

function texto(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function atribuicaoToData(item: AtribuicaoCobranca) {
  return {
    id: item.id,
    unitId: item.unidadeId,
    attendantId: item.atendenteId,
    assignedById: item.atribuidoPorId,
    assignedAt: dateFromIsoDateTime(item.atribuidoEm) ?? new Date(),
    closedAt: item.encerradoEm ? dateFromIsoDateTime(item.encerradoEm) : null,
    reason: texto(item.motivo),
    previousAttendantId: item.anteriorAtendenteId,
  };
}

export async function listCollectionAssignments(): Promise<AtribuicaoCobranca[]> {
  const rows = await prisma.collectionAssignment.findMany({ orderBy: { id: "asc" } });
  return rows.map(mapAssignmentToAtribuicao);
}

export async function findCollectionAssignmentById(id: number): Promise<AtribuicaoCobranca | null> {
  const row = await prisma.collectionAssignment.findUnique({ where: { id } });
  return row ? mapAssignmentToAtribuicao(row) : null;
}

export async function findOpenAssignmentByUnit(unitId: number): Promise<AtribuicaoCobranca | null> {
  const row = await prisma.collectionAssignment.findFirst({
    where: { unitId, closedAt: null },
    orderBy: { assignedAt: "desc" },
  });
  return row ? mapAssignmentToAtribuicao(row) : null;
}

export async function nextCollectionAssignmentId(): Promise<number> {
  const agg = await prisma.collectionAssignment.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0) + 1;
}

export async function createCollectionAssignment(item: AtribuicaoCobranca): Promise<AtribuicaoCobranca> {
  const row = await prisma.collectionAssignment.create({ data: atribuicaoToData(item) });
  return mapAssignmentToAtribuicao(row);
}

export async function updateCollectionAssignment(item: AtribuicaoCobranca): Promise<AtribuicaoCobranca> {
  const data = atribuicaoToData(item);
  const row = await prisma.collectionAssignment.update({
    where: { id: item.id },
    data: { ...data, id: undefined },
  });
  return mapAssignmentToAtribuicao(row);
}

/** Substitui todas as atribuições (uso em redistribuição em lote). */
export async function replaceAllCollectionAssignments(itens: AtribuicaoCobranca[]): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.collectionAssignment.deleteMany();
    for (const item of itens) {
      await tx.collectionAssignment.create({ data: atribuicaoToData(item) });
    }
  });
}

export async function upsertCollectionAssignments(itens: AtribuicaoCobranca[]): Promise<void> {
  for (const item of itens) {
    await prisma.collectionAssignment.upsert({
      where: { id: item.id },
      create: atribuicaoToData(item),
      update: {
        unitId: item.unidadeId,
        attendantId: item.atendenteId,
        assignedById: item.atribuidoPorId,
        assignedAt: dateFromIsoDateTime(item.atribuidoEm) ?? new Date(),
        closedAt: item.encerradoEm ? dateFromIsoDateTime(item.encerradoEm) : null,
        reason: texto(item.motivo),
        previousAttendantId: item.anteriorAtendenteId,
      },
    });
  }
}
