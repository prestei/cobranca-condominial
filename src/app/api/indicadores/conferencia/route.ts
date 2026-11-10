import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  ConferenciaIndicadoresError,
  consultarReferenciaIndicador,
  obterCatalogoIndicadoresOficiais,
} from "@/lib/indicadores/conferencia";
import type { IndicadorProdutividadeId } from "@/lib/indicadores/catalogo-oficial";
import { assertCondominioNoEscopo, parseRelatorioFiltros } from "@/lib/relatorios/service";

const IDS: IndicadorProdutividadeId[] = [
  "atendimentos_registrados",
  "retornos_concluidos",
  "retornos_previstos",
  "retornos_atrasados",
  "retornos_em_aberto",
  "negociacoes_criadas",
  "acoes_agendadas",
  "acordos_confirmados",
  "cobrancas_carteira",
];

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const denied = await requirePermissao(session, "relatorios", "ler");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const indicadorRaw = searchParams.get("indicador")?.trim();

  if (!indicadorRaw || indicadorRaw === "catalogo") {
    return Response.json({ catalogo: obterCatalogoIndicadoresOficiais() });
  }

  if (!IDS.includes(indicadorRaw as IndicadorProdutividadeId)) {
    return Response.json({ error: "Informe um indicador válido para conferência." }, { status: 400 });
  }

  const filtros = parseRelatorioFiltros(searchParams, "produtividade");

  try {
    await assertCondominioNoEscopo(session.userId, filtros.condominioId);
    const consulta = await consultarReferenciaIndicador(session.userId, indicadorRaw as IndicadorProdutividadeId, filtros);
    return Response.json({ consulta });
  } catch (error) {
    if (error instanceof ConferenciaIndicadoresError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível consultar a referência do indicador." }, { status: 500 });
  }
}
