import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { RelatorioServiceError, obterOpcoesFiltrosRelatorio } from "@/lib/relatorios/service";

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const denied = await requirePermissao(session, "relatorios", "ler");
  if (denied) return denied;

  try {
    const opcoes = obterOpcoesFiltrosRelatorio(session.userId);
    return Response.json({ opcoes });
  } catch (error) {
    if (error instanceof RelatorioServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar opções de filtro." }, { status: 500 });
  }
}
