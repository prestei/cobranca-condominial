import { Atendimento } from "@/data/catalogo";
import { prisma } from "@/lib/db/prisma";
import { dateFromIsoDateTime, mapTicketToAtendimento } from "@/lib/db/mappers";

function texto(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function intOuNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function atendimentoToData(item: Atendimento) {
  return {
    id: item.id,
    unitId: intOuNull(item.unidadeId) ?? 0,
    responsiblePartyId: intOuNull(item.responsavelId),
    userId: item.usuarioId,
    occurredAt: dateFromIsoDateTime(item.dataHora) ?? new Date(),
    channel: texto(item.canal),
    answered: texto(item.respondeu),
    reason: texto(item.motivo),
    subject: texto(item.assunto),
    description: texto(item.descricao),
    status: item.status,
    nextActionAt: item.dataProximaAcao ? dateFromIsoDateTime(item.dataProximaAcao) : null,
    nextAction: texto(item.proximaAcao),
    returnCompletedAt: item.retornoConcluidoEm ? dateFromIsoDateTime(item.retornoConcluidoEm) : null,
    returnCompletedById: item.retornoConcluidoPorId,
  };
}

export async function listServiceTickets(): Promise<Atendimento[]> {
  const rows = await prisma.serviceTicket.findMany({ orderBy: [{ occurredAt: "asc" }, { id: "asc" }] });
  return rows.map(mapTicketToAtendimento);
}

export async function findServiceTicketById(id: string): Promise<Atendimento | null> {
  const row = await prisma.serviceTicket.findUnique({ where: { id } });
  return row ? mapTicketToAtendimento(row) : null;
}

export async function createServiceTicket(item: Atendimento): Promise<Atendimento> {
  const row = await prisma.serviceTicket.create({ data: atendimentoToData(item) });
  return mapTicketToAtendimento(row);
}

export async function updateServiceTicket(item: Atendimento): Promise<Atendimento> {
  const data = atendimentoToData(item);
  const row = await prisma.serviceTicket.update({
    where: { id: item.id },
    data: { ...data, id: undefined },
  });
  return mapTicketToAtendimento(row);
}

export async function deleteServiceTicket(id: string): Promise<void> {
  await prisma.serviceTicket.delete({ where: { id } });
}
