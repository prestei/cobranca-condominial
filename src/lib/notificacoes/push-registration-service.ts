import "server-only";

import { agoraIso } from "@/data/catalogo";
import {
  deletePushTokenByValue,
  upsertPushTokenForUser,
} from "@/lib/db/repositories/user-push-token-repository";
import { pushFirebaseHabilitadoNoServidor } from "@/lib/notificacoes/firebase-config";

export class PushRegistrationError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

const MAX_TOKEN_LENGTH = 512;

function normalizarToken(value: unknown): string {
  if (typeof value !== "string") {
    throw new PushRegistrationError("Token inválido.", 400);
  }
  const token = value.trim();
  if (!token || token.length > MAX_TOKEN_LENGTH) {
    throw new PushRegistrationError("Token inválido.", 400);
  }
  return token;
}

export async function registrarPushTokenUsuario(
  userId: number,
  input: { token: unknown; userAgent?: unknown },
): Promise<{ ok: true }> {
  if (!pushFirebaseHabilitadoNoServidor()) {
    throw new PushRegistrationError("Push não está configurado neste ambiente.", 503);
  }
  const fcmToken = normalizarToken(input.token);
  const userAgent =
    typeof input.userAgent === "string" && input.userAgent.trim()
      ? input.userAgent.trim().slice(0, 512)
      : null;
  const agora = new Date(agoraIso());
  await upsertPushTokenForUser({ userId, fcmToken, userAgent, now: agora });
  return { ok: true };
}

export async function removerPushTokenUsuario(userId: number, token: unknown): Promise<{ ok: true }> {
  const fcmToken = normalizarToken(token);
  await deletePushTokenByValue(fcmToken, userId);
  return { ok: true };
}
