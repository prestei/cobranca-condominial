import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { listarHistoricoRetornosAtendimento, RetornoServiceError } from "@/lib/retornos/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "atendimentos", "ler");
  if (denied) return denied;

  const { id } = await context.params;
  if (!id?.trim()) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const eventos = listarHistoricoRetornosAtendimento(session.userId, id);
    return Response.json({ eventos });
  } catch (error) {
    if (error instanceof RetornoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar o histórico do retorno." }, { status: 500 });
  }
}
