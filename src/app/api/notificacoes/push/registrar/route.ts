import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  PushRegistrationError,
  registrarPushTokenUsuario,
  removerPushTokenUsuario,
} from "@/lib/notificacoes/push-registration-service";

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "dashboard", "ler");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const payload = body as { token?: unknown; userAgent?: unknown };
  try {
    await registrarPushTokenUsuario(session.userId, {
      token: payload.token,
      userAgent: payload.userAgent,
    });
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof PushRegistrationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível registrar o dispositivo." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "dashboard", "ler");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const payload = body as { token?: unknown };
  try {
    await removerPushTokenUsuario(session.userId, payload.token);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof PushRegistrationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível remover o dispositivo." }, { status: 500 });
  }
}
