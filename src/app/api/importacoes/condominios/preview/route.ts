import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { parseCorpoPreviewImportacao } from "@/lib/importacoes/api-corpo-importacao";
import { ImportacaoCondominiosError, previewImportacaoCondominios } from "@/lib/importacoes/condominios-service";

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

  const input = parseCorpoPreviewImportacao(body);
  if (!input) {
    return Response.json({ error: "Dados da importação inválidos." }, { status: 400 });
  }

  try {
    const preview = await previewImportacaoCondominios(session.userId, input);
    return Response.json({ preview });
  } catch (error) {
    if (error instanceof ImportacaoCondominiosError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível validar o arquivo." }, { status: 500 });
  }
}
