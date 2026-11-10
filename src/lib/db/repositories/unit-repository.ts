import type { Unidade, Vinculo } from "@/data/catalogo";
import { prisma } from "@/lib/db/prisma";
import { mapUnitToUnidade, mapUnitLinkToVinculo } from "@/lib/db/mappers";

function texto(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function unidadeToData(item: Unidade) {
  return {
    id: item.id,
    condominiumId: item.condominioId,
    identification: item.identificacao,
    block: texto(item.bloco),
    type: item.tipo,
    status: item.status,
    collectionStatus: item.situacao,
  };
}

function vinculoToData(item: Vinculo) {
  return {
    id: item.id,
    unitId: item.unidadeId,
    responsiblePartyId: item.responsavelId,
    linkType: item.tipoVinculo,
    primary: Boolean(item.principal),
    notes: texto(item.observacoes),
  };
}

export async function listUnits(): Promise<Unidade[]> {
  const rows = await prisma.unit.findMany({ orderBy: { id: "asc" } });
  return rows.map(mapUnitToUnidade);
}

export async function listUnitsByCondominium(condominiumId: number): Promise<Unidade[]> {
  const rows = await prisma.unit.findMany({
    where: { condominiumId },
    orderBy: { id: "asc" },
  });
  return rows.map(mapUnitToUnidade);
}

export async function findUnitById(id: number): Promise<Unidade | null> {
  const row = await prisma.unit.findUnique({ where: { id } });
  return row ? mapUnitToUnidade(row) : null;
}

export async function unitIdentificationExists(
  condominioId: number,
  identificacao: string,
  excludeId: number | null,
): Promise<boolean> {
  const row = await prisma.unit.findFirst({
    where: {
      condominiumId: condominioId,
      identification: identificacao.trim(),
      ...(excludeId !== null ? { NOT: { id: excludeId } } : {}),
    },
  });
  return Boolean(row);
}

export async function nextUnitId(): Promise<number> {
  const agg = await prisma.unit.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0) + 1;
}

export async function createUnit(item: Unidade): Promise<Unidade> {
  const row = await prisma.unit.create({ data: unidadeToData(item) });
  return mapUnitToUnidade(row);
}

export async function updateUnit(item: Unidade): Promise<Unidade> {
  const row = await prisma.unit.update({
    where: { id: item.id },
    data: {
      condominiumId: item.condominioId,
      identification: item.identificacao,
      block: texto(item.bloco),
      type: item.tipo,
      status: item.status,
      collectionStatus: item.situacao,
    },
  });
  return mapUnitToUnidade(row);
}

export async function deleteUnit(id: number): Promise<void> {
  await prisma.unit.delete({ where: { id } });
}

export async function listUnitLinks(): Promise<Vinculo[]> {
  const rows = await prisma.unitResponsibleParty.findMany({ orderBy: { id: "asc" } });
  return rows.map(mapUnitLinkToVinculo);
}

export async function listUnitLinksByUnit(unitId: number): Promise<Vinculo[]> {
  const rows = await prisma.unitResponsibleParty.findMany({
    where: { unitId },
    orderBy: { id: "asc" },
  });
  return rows.map(mapUnitLinkToVinculo);
}

export async function findUnitLinkById(id: number): Promise<Vinculo | null> {
  const row = await prisma.unitResponsibleParty.findUnique({ where: { id } });
  return row ? mapUnitLinkToVinculo(row) : null;
}

export async function nextUnitLinkId(): Promise<number> {
  const agg = await prisma.unitResponsibleParty.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0) + 1;
}

export async function createUnitLink(item: Vinculo): Promise<Vinculo> {
  const row = await prisma.unitResponsibleParty.create({ data: vinculoToData(item) });
  return mapUnitLinkToVinculo(row);
}

export async function updateUnitLink(item: Vinculo): Promise<Vinculo> {
  const row = await prisma.unitResponsibleParty.update({
    where: { id: item.id },
    data: {
      unitId: item.unidadeId,
      responsiblePartyId: item.responsavelId,
      linkType: item.tipoVinculo,
      primary: Boolean(item.principal),
      notes: texto(item.observacoes),
    },
  });
  return mapUnitLinkToVinculo(row);
}

export async function deleteUnitLink(id: number): Promise<void> {
  await prisma.unitResponsibleParty.delete({ where: { id } });
}

export async function clearPrimaryLinksForUnit(unitId: number): Promise<void> {
  await prisma.unitResponsibleParty.updateMany({
    where: { unitId, primary: true },
    data: { primary: false },
  });
}
