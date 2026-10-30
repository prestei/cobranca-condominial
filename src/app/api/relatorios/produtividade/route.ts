import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { montarPainelProdutividadePorRe } from "@/lib/relatorios/produtividade";
import {
  RelatorioServiceError,
  assertCondominioNoEscopo,
  parseRelatorioFiltros,
} from "@/lib/relatorios/service";

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const denied = await requirePermissao(session, "relatorios", "ler");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const filtros = parseRelatorioFiltros(searchParams, "produtividade");

  try {
    assertCondominioNoEscopo(session.userId, filtros.condominioId);
    const painel = montarPainelProdutividadePorRe(session.userId, filtros);
    return Response.json({ painel });
  } catch (error) {
    if (error instanceof RelatorioServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível consultar a produtividade." }, { status: 500 });
  }
}
