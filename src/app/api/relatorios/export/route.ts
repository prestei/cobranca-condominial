import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { relatorioParaCsv, relatorioParaXls } from "@/lib/relatorios/export-csv";
import {
  RelatorioServiceError,
  assertCondominioNoEscopo,
  assertRelatorioTipo,
  montarExportRelatorio,
  parseRelatorioFiltros,
} from "@/lib/relatorios/service";

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const denied = await requirePermissao(session, "relatorios", "exportar");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  let tipo;
  try {
    tipo = assertRelatorioTipo(searchParams.get("tipo"));
  } catch (error) {
    if (error instanceof RelatorioServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Tipo de relatório inválido." }, { status: 400 });
  }

  const filtros = parseRelatorioFiltros(searchParams, tipo);
  try {
    assertCondominioNoEscopo(session.userId, filtros.condominioId);
    const payload = montarExportRelatorio(session.userId, tipo, filtros);
    const formato = searchParams.get("formato")?.trim().toLowerCase() ?? "csv";

    if (formato === "xls" || formato === "excel") {
      const body = relatorioParaXls(payload);
      return new Response(body, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.ms-excel; charset=utf-8",
          "Content-Disposition": `attachment; filename="${payload.nomeArquivo}.xls"`,
        },
      });
    }

    if (formato === "json") {
      return Response.json({ payload });
    }

    if (formato !== "csv") {
      return Response.json({ error: "Formato de exportação não suportado. Use csv, xls ou json." }, { status: 400 });
    }

    const body = relatorioParaCsv(payload);
    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${payload.nomeArquivo}.csv"`,
      },
    });
  } catch (error) {
    if (error instanceof RelatorioServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível gerar a exportação." }, { status: 500 });
  }
}
