import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { contarNotificacoesNaoLidas, NotificacaoServiceError } from "@/lib/notificacoes/service";

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "dashboard", "ler");
  if (denied) return denied;

  try {
    const total = contarNotificacoesNaoLidas(session.userId);
    return Response.json({ total });
  } catch (error) {
    if (error instanceof NotificacaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível contar as notificações." }, { status: 500 });
  }
}
