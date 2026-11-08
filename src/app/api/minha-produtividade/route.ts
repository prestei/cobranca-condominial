import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  MinhaProdutividadeError,
  listarRegistrosIndicador,
  montarPainelMinhaProdutividade,
  type IndicadorMinhaProdutividadeId,
} from "@/lib/produtividade-individual/service";

const INDICADORES_VALIDOS = new Set<IndicadorMinhaProdutividadeId>([
  "atendimentos_realizados",
  "atendimentos_concluidos",
  "atendimentos_pendentes",
  "retornos_realizados",
  "atendimentos_reabertos",
  "atendimentos_criados",
  "atendimentos_movimentados",
  "conclusoes_efetivas",
]);

function parseIndicador(valor: string | null): IndicadorMinhaProdutividadeId | null {
  const chave = valor?.trim() as IndicadorMinhaProdutividadeId;
  if (!chave || !INDICADORES_VALIDOS.has(chave)) return null;
  return chave;
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const denied = await requirePermissao(session, "atendimentos", "ler");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const de = searchParams.get("de")?.trim() ?? "";
  const ate = searchParams.get("ate")?.trim() ?? "";
  const indicador = parseIndicador(searchParams.get("indicador"));

  try {
    if (indicador) {
      const registros = listarRegistrosIndicador(session.userId, indicador, de, ate);
      return Response.json({ indicador, registros });
    }
    const painel = montarPainelMinhaProdutividade(session.userId, de, ate);
    return Response.json({ painel });
  } catch (error) {
    if (error instanceof MinhaProdutividadeError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível consultar a produtividade individual." }, { status: 500 });
  }
}
