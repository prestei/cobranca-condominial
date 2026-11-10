import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { loadFullOperationalCadastros } from "@/lib/db/cadastros-scope";
import { parseCorpoPreviewConfirmarImportacao } from "@/lib/importacoes/api-corpo-importacao";
import { requirePermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
import { ImportacaoResponsaveisError, confirmarImportacaoResponsaveis } from "@/lib/importacoes/responsaveis-service";
import { requestMeta } from "@/lib/unidades/service";

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissaoAcaoImportacao(session, "aprovarImportacao");
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
    const { responsaveis, vinculos } = (await loadFullOperationalCadastros());
    return Response.json({ resultado, responsaveis, vinculos });
  } catch (error) {
    if (error instanceof ImportacaoResponsaveisError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível concluir a importação." }, { status: 500 });
  }
}
