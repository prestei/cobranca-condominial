import { prisma } from "@/lib/db/prisma";
import { isoDate } from "@/lib/db/mappers";
import type { PeriodoInadimplenciaUnidade } from "@/lib/unidades/delinquency-periods";

function mapPeriod(row: {
  id: number;
  unitId: number;
  startedAt: Date;
  endedAt: Date | null;
  openedByUserId: number | null;
  closedByUserId: number | null;
}): PeriodoInadimplenciaUnidade {
  return {
    id: row.id,
    unidadeId: row.unitId,
    inicioEm: isoDate(row.startedAt),
    fimEm: row.endedAt ? isoDate(row.endedAt) : null,
    usuarioAberturaId: row.openedByUserId,
    usuarioEncerramentoId: row.closedByUserId,
  };
}

export async function listOpenDelinquencyPeriodByUnit(
  unitId: number,
): Promise<PeriodoInadimplenciaUnidade | null> {
  const row = await prisma.unitDelinquencyPeriod.findFirst({
    where: { unitId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });
  return row ? mapPeriod(row) : null;
}

export async function listDelinquencyPeriodsByUnit(unitId: number): Promise<PeriodoInadimplenciaUnidade[]> {
  const rows = await prisma.unitDelinquencyPeriod.findMany({
    where: { unitId },
    orderBy: { startedAt: "asc" },
  });
  return rows.map(mapPeriod);
}

export async function openDelinquencyPeriod(
  unitId: number,
  inicioEm: string,
  userId: number | null,
): Promise<PeriodoInadimplenciaUnidade> {
  const row = await prisma.unitDelinquencyPeriod.create({
    data: {
      unitId,
      startedAt: new Date(`${inicioEm}T00:00:00.000Z`),
      openedByUserId: userId,
    },
  });
  return mapPeriod(row);
}

export async function closeDelinquencyPeriod(
  periodId: number,
  fimEm: string,
  userId: number | null,
): Promise<PeriodoInadimplenciaUnidade> {
  const row = await prisma.unitDelinquencyPeriod.update({
    where: { id: periodId },
    data: {
      endedAt: new Date(`${fimEm}T00:00:00.000Z`),
      closedByUserId: userId,
    },
  });
  return mapPeriod(row);
}