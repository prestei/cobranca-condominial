import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  ExportarCarteiraError,
  montarExportacaoCarteiraDashboard,
  parseListagemExportacaoCarteira,
} from "@/lib/dashboard/exportar-carteira";
import { relatorioParaCsv, relatorioParaXls } from "@/lib/relatorios/export-csv";

function metaRequest(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "dashboard", "ler");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const formato = searchParams.get("formato")?.trim().toLowerCase() ?? "csv";

  try {
    const listagem = parseListagemExportacaoCarteira(searchParams.get("listagem"));
    const payload = montarExportacaoCarteiraDashboard(session.userId, listagem, searchParams, metaRequest(request));

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

    if (formato !== "csv") {
      return Response.json({ error: "Formato de exportação não suportado. Use csv ou xls." }, { status: 400 });
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
    if (error instanceof ExportarCarteiraError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível gerar a exportação." }, { status: 500 });
  }
}
