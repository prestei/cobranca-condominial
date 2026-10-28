import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { requestMeta } from "@/lib/unidades/service";
import {
  DistribuicaoServiceError,
  contarUnidadesAguardandoAtribuicao,
  executarDistribuicaoAutomatica,
} from "@/lib/distribuicao/service";
import type { AtribuicaoCobranca } from "@/data/catalogo";

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "usuarios", "criar");
  if (denied) return denied;

  try {
    const resultado = executarDistribuicaoAutomatica(session.userId, requestMeta(request));
    const atribuicoesCobranca: AtribuicaoCobranca[] = resultado.atribuicoes;
    return Response.json({
      atribuidas: resultado.atribuidas,
      ignoradasMesmoResponsavel: resultado.ignoradasMesmoResponsavel,
      pendentesAntes: resultado.pendentesAntes,
      atribuicoesCobranca,
      aguardandoAtribuicao: contarUnidadesAguardandoAtribuicao(session.userId),
    });
  } catch (error) {
    if (error instanceof DistribuicaoServiceError) {
      return Response.json({ error: error.message, detalhes: error.detalhes }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível executar a distribuição automática." }, { status: 500 });
  }
}
