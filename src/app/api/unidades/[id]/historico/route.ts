import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import {
  HistoricoUnidadeServiceError,
  obterHistoricoUnidade,
} from "@/lib/historico-unidade/service";

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id === null) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const historico = obterHistoricoUnidade(session.userId, id);
    return Response.json(historico);
  } catch (error) {
    if (error instanceof HistoricoUnidadeServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar o histórico." }, { status: 500 });
  }
}
