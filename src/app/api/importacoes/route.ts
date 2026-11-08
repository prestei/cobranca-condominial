import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { requirePermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
import { listarImportacoesHistorico } from "@/lib/importacoes/historico-service";

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = requirePermissaoAcaoImportacao(session, "consultarHistorico");
  if (denied) return denied;

  const importacoes = listarImportacoesHistorico(session.userId);
  return Response.json({ importacoes });
}
