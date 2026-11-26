import { dateFromIsoDateTime } from "@/lib/db/mappers";

export type NegotiationQueueSource = {
  filaNegociacaoEm?: string;
  filaNegociacaoPorId?: number | null;
};

/**
 * Persistência da fila de negociação na proposta.
 * Campos vazios são omitidos no create para não falhar quando o Prisma Client
 * ainda não foi regenerado após migração com `negotiation_queue_*`.
 */
export function negotiationQueueFields(
  item: NegotiationQueueSource,
  options?: { clearWhenEmpty?: boolean },
): {
  negotiationQueueAt?: Date | null;
  negotiationQueueByUserId?: number | null;
} {
  const result: {
    negotiationQueueAt?: Date | null;
    negotiationQueueByUserId?: number | null;
  } = {};

  const em = item.filaNegociacaoEm?.trim() ?? "";
  if (em) {
    const parsed = dateFromIsoDateTime(em);
    if (parsed) result.negotiationQueueAt = parsed;
  } else if (options?.clearWhenEmpty) {
    result.negotiationQueueAt = null;
  }

  if (item.filaNegociacaoPorId != null) {
    result.negotiationQueueByUserId = item.filaNegociacaoPorId;
  } else if (options?.clearWhenEmpty) {
    result.negotiationQueueByUserId = null;
  }

  return result;
}