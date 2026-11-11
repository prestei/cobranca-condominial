import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { requirePermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
import { listarImportacoesHistorico } from "@/lib/importacoes/historico-service";
import { limparCadastrosProvisionadosPreviaAbandonada } from "@/lib/importacoes/inadimplencia/reverter-provisionamento-previa-debitos";

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissaoAcaoImportacao(session, "consultarHistorico");
  if (denied) return denied;

  await limparCadastrosProvisionadosPreviaAbandonada(session.userId);
  const importacoes = await listarImportacoesHistorico(session.userId);
  return Response.json({ importacoes });
}
