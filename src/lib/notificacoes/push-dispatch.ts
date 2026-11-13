import "server-only";

import type { NotificacaoInterna } from "@/data/catalogo";
import {
  deletePushTokensByValues,
  listPushTokensByUserId,
} from "@/lib/db/repositories/user-push-token-repository";
import { obterFirebaseMessaging } from "@/lib/notificacoes/firebase-admin";
import { pushFirebaseHabilitadoNoServidor } from "@/lib/notificacoes/firebase-config";
import { resolverUrlRegistroNotificacao } from "@/lib/notificacoes/notification-deep-link";

const CODIGOS_TOKEN_INVALIDO = new Set([
  "messaging/registration-token-not-registered",
  "messaging/invalid-registration-token",
  "messaging/invalid-argument",
]);

/** Dispara push web para todos os dispositivos do destinatário; falhas não bloqueiam o fluxo in-app. */
export async function dispatchPushForInternalNotification(item: NotificacaoInterna): Promise<void> {
  if (!pushFirebaseHabilitadoNoServidor()) return;

  const messaging = obterFirebaseMessaging();
  if (!messaging) return;

  const tokens = await listPushTokensByUserId(item.destinatarioId);
  if (tokens.length === 0) return;

  const url = resolverUrlRegistroNotificacao(item) ?? "/notificacoes";
  const body = item.descricao?.trim() || "Abra o sistema para ver o detalhe.";
  const invalidos: string[] = [];

  await Promise.all(
    tokens.map(async (registro) => {
      try {
        await messaging.send({
          token: registro.fcmToken,
          notification: {
            title: item.titulo,
            body: body.length > 240 ? `${body.slice(0, 237)}…` : body,
          },
          data: {
            notificationId: String(item.id),
            url,
            evento: item.evento,
          },
          webpush: {
            fcmOptions: { link: url.startsWith("/") ? url : `/${url}` },
          },
        });
      } catch (error: unknown) {
        const codigo =
          typeof error === "object" && error !== null && "code" in error
            ? String((error as { code?: string }).code ?? "")
            : "";
        if (CODIGOS_TOKEN_INVALIDO.has(codigo)) {
          invalidos.push(registro.fcmToken);
        }
      }
    }),
  );

  if (invalidos.length > 0) {
    await deletePushTokensByValues(invalidos);
  }
}
