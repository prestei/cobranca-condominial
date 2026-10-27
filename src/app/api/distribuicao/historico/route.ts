import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import {
  DistribuicaoServiceError,
  listarHistoricoAtribuicoes,
  podeGerenciarDistribuicao,
} from "@/lib/distribuicao/service";

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  if (!podeGerenciarDistribuicao(session.userId)) {
    return Response.json({ error: "Sem permissão para consultar o histórico." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const unidadeId = Number(searchParams.get("unidadeId"));
  const limit = Number(searchParams.get("limit") ?? "50");

  try {
    const historico = listarHistoricoAtribuicoes(session.userId, {
      unidadeId: Number.isFinite(unidadeId) && unidadeId > 0 ? unidadeId : undefined,
      limit,
    });
    return Response.json({ historico });
  } catch (error) {
    if (error instanceof DistribuicaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar o histórico." }, { status: 500 });
  }
}
