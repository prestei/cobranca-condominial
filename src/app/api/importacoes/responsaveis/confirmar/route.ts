import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { getCadastros } from "@/data/catalogo";
import { parseCorpoPreviewConfirmarImportacao } from "@/lib/importacoes/api-corpo-importacao";
import { ImportacaoResponsaveisError, confirmarImportacaoResponsaveis } from "@/lib/importacoes/responsaveis-service";
import { requestMeta } from "@/lib/unidades/service";

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "importacoes", "criar");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parseCorpoPreviewConfirmarImportacao(body);
  if (!input) {
    return Response.json({ error: "Dados da importação inválidos." }, { status: 400 });
  }

  try {
    const resultado = await confirmarImportacaoResponsaveis(session.userId, input, requestMeta(request));
    const { responsaveis, vinculos } = getCadastros();
    return Response.json({ resultado, responsaveis, vinculos });
  } catch (error) {
    if (error instanceof ImportacaoResponsaveisError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível concluir a importação." }, { status: 500 });
  }
}
