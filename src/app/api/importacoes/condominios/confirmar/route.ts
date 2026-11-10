import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { escopoCondominios, getCadastros } from "@/data/catalogo";
import { parseCorpoPreviewConfirmarImportacao } from "@/lib/importacoes/api-corpo-importacao";
import { ImportacaoCondominiosError, confirmarImportacaoCondominios } from "@/lib/importacoes/condominios-service";
import { requirePermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
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
    const resultado = await confirmarImportacaoCondominios(session.userId, input, requestMeta(request));
    const condominios = escopoCondominios(getCadastros(), session.userId);
    return Response.json({ resultado, condominios });
  } catch (error) {
    if (error instanceof ImportacaoCondominiosError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível concluir a importação." }, { status: 500 });
  }
}
