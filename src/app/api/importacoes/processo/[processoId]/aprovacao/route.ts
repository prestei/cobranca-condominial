import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { requirePermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
import { registrarAprovacaoPendente } from "@/lib/importacao-centro/historico-auditoria";

type RouteContext = { params: Promise<{ processoId: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissaoAcaoImportacao(session, "aprovarImportacao");
  if (denied) return denied;

  const { processoId } = await context.params;
  if (!processoId?.trim()) {
    return Response.json({ error: "Processo inválido." }, { status: 400 });
  }

  const atualizado = registrarAprovacaoPendente(processoId.trim(), session.userId);
  if (!atualizado) {
    return Response.json({ error: "Importação não encontrada para este envio." }, { status: 404 });
  }

  return Response.json({ importacao: atualizado });
}
