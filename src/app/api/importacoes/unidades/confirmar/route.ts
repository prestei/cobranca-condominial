import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { escopoCondominios, getCadastros } from "@/data/catalogo";
import { parseCorpoPreviewConfirmarImportacao } from "@/lib/importacoes/api-corpo-importacao";
import { requirePermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
import { ImportacaoUnidadesError, confirmarImportacaoUnidades } from "@/lib/importacoes/unidades-service";
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
    const resultado = await confirmarImportacaoUnidades(session.userId, input, requestMeta(request));
    const scopeIds = new Set(escopoCondominios(getCadastros(), session.userId).map((item) => item.id));
    const unidades = getCadastros().unidades.filter((item) => scopeIds.has(item.condominioId));
    return Response.json({ resultado, unidades });
  } catch (error) {
    if (error instanceof ImportacaoUnidadesError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível concluir a importação." }, { status: 500 });
  }
}
