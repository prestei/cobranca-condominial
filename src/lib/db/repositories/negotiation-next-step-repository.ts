import { DecisaoProximoPassoNegociacao } from "@/data/catalogo";
import { prisma } from "@/lib/db/prisma";
import { dateFromIsoDateTime, mapNextStepDecisionToDecisao } from "@/lib/db/mappers";

function texto(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function decisaoToData(item: DecisaoProximoPassoNegociacao) {
  return {
    id: item.id,
    proposalId: item.propostaId,
    condominiumId: item.condominioId,
    unitId: item.unidadeId,
    userId: item.usuarioId,
    decidedAt: dateFromIsoDateTime(item.decididoEm) ?? new Date(),
    action: item.acao,
    analysisTarget: texto(item.destinoAnalise) || null,
    destinationLabel: item.destinoRotulo,
    responsibleUserId: item.responsavelUsuarioId,
    legalReferralId: texto(item.encaminhamentoJuridicoId) || null,
    notes: texto(item.observacoes),
    idempotencyKey: item.idempotencyKey,
  };
}

export async function findNextStepDecisionByProposalId(
  proposalId: string,
): Promise<DecisaoProximoPassoNegociacao | null> {
  const row = await prisma.negotiationNextStepDecision.findUnique({ where: { proposalId } });
  return row ? mapNextStepDecisionToDecisao(row) : null;
}

export async function findNextStepDecisionByIdempotencyKey(
  idempotencyKey: string,
): Promise<DecisaoProximoPassoNegociacao | null> {
  const row = await prisma.negotiationNextStepDecision.findUnique({ where: { idempotencyKey } });
  return row ? mapNextStepDecisionToDecisao(row) : null;
}

export async function listNextStepDecisionsByUnit(unitId: number): Promise<DecisaoProximoPassoNegociacao[]> {
  const rows = await prisma.negotiationNextStepDecision.findMany({
    where: { unitId },
    orderBy: { decidedAt: "asc" },
  });
  return rows.map(mapNextStepDecisionToDecisao);
}

export async function createNextStepDecision(
  item: DecisaoProximoPassoNegociacao,
): Promise<DecisaoProximoPassoNegociacao> {
  const row = await prisma.negotiationNextStepDecision.create({ data: decisaoToData(item) });
  return mapNextStepDecisionToDecisao(row);
}