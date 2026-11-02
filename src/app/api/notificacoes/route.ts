import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { listarNotificacoes, NotificacaoServiceError } from "@/lib/notificacoes/service";

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "dashboard", "ler");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit"));
  const apenasNaoLidas = searchParams.get("naoLidas") === "1";

  try {
    const notificacoes = listarNotificacoes(session.userId, {
      limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
      apenasNaoLidas,
    });
    return Response.json({ notificacoes });
  } catch (error) {
    if (error instanceof NotificacaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar as notificações." }, { status: 500 });
  }
}
