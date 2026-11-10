import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { marcarNotificacaoLida, NotificacaoServiceError } from "@/lib/notificacoes/service";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: Params) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "dashboard", "ler");
  if (denied) return denied;

  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isFinite(id) || id <= 0) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const notificacao = await marcarNotificacaoLida(session.userId, id);
    return Response.json({ notificacao });
  } catch (error) {
    if (error instanceof NotificacaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível marcar a notificação." }, { status: 500 });
  }
}
