import { NotificacaoFalha, NotificacaoInterna } from "@/data/catalogo";
import { prisma } from "@/lib/db/prisma";
import {
  dateFromIsoDateTime,
  mapNotificationFailureToFalha,
  mapNotificationToNotificacao,
} from "@/lib/db/mappers";

function texto(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function notificacaoToData(item: NotificacaoInterna) {
  return {
    id: item.id,
    idempotencyKey: item.chaveIdempotencia,
    event: item.evento,
    recipientId: item.destinatarioId,
    title: item.titulo,
    description: texto(item.descricao),
    entityType: item.entidadeTipo,
    recordId: item.registroId,
    unitId: item.unidadeId || null,
    condominiumId: item.condominioId,
    createdAt: dateFromIsoDateTime(item.criadoEm) ?? new Date(),
    readAt: item.lidaEm ? dateFromIsoDateTime(item.lidaEm) : null,
  };
}

function falhaToData(item: NotificacaoFalha) {
  return {
    id: item.id,
    idempotencyKey: item.chaveIdempotencia,
    event: item.evento,
    recipientId: item.destinatarioId,
    error: item.erro,
    occurredAt: dateFromIsoDateTime(item.ocorridoEm) ?? new Date(),
  };
}

export async function listInternalNotifications(): Promise<NotificacaoInterna[]> {
  const rows = await prisma.internalNotification.findMany({ orderBy: { id: "asc" } });
  return rows.map(mapNotificationToNotificacao);
}

export async function listInternalNotificationsByRecipient(recipientId: number): Promise<NotificacaoInterna[]> {
  const rows = await prisma.internalNotification.findMany({
    where: { recipientId },
    orderBy: { id: "desc" },
  });
  return rows.map(mapNotificationToNotificacao);
}

export async function findInternalNotificationById(id: number): Promise<NotificacaoInterna | null> {
  const row = await prisma.internalNotification.findUnique({ where: { id } });
  return row ? mapNotificationToNotificacao(row) : null;
}

export async function findInternalNotificationByIdempotencyKey(
  key: string,
): Promise<NotificacaoInterna | null> {
  const row = await prisma.internalNotification.findUnique({ where: { idempotencyKey: key } });
  return row ? mapNotificationToNotificacao(row) : null;
}

export async function nextInternalNotificationId(): Promise<number> {
  const agg = await prisma.internalNotification.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0) + 1;
}

export async function createInternalNotification(item: NotificacaoInterna): Promise<NotificacaoInterna> {
  const row = await prisma.internalNotification.create({ data: notificacaoToData(item) });
  return mapNotificationToNotificacao(row);
}

export async function updateInternalNotification(item: NotificacaoInterna): Promise<NotificacaoInterna> {
  const data = notificacaoToData(item);
  const row = await prisma.internalNotification.update({
    where: { id: item.id },
    data: { ...data, id: undefined },
  });
  return mapNotificationToNotificacao(row);
}

export async function listNotificationFailures(): Promise<NotificacaoFalha[]> {
  const rows = await prisma.notificationFailure.findMany({ orderBy: { id: "asc" } });
  return rows.map(mapNotificationFailureToFalha);
}

export async function nextNotificationFailureId(): Promise<number> {
  const agg = await prisma.notificationFailure.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0) + 1;
}

export async function prependNotificationFailure(item: NotificacaoFalha): Promise<void> {
  await prisma.notificationFailure.create({ data: falhaToData(item) });
}
