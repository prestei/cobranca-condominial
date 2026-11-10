import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { requirePermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
import {
  HistoricoImportacaoError,
  avaliarRetomadaImportacao,
  excluirImportacaoHistorico,
  obterImportacaoHistorico,
} from "@/lib/importacoes/historico-service";
import { obterImportacaoPorId } from "@/lib/importacao-centro/historico-auditoria";
import { requestMeta } from "@/lib/unidades/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissaoAcaoImportacao(session, "consultarHistorico");
  if (denied) return denied;

  const { id: idRaw } = await context.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  const bruto = obterImportacaoPorId(id);
  if (!bruto) {
    return Response.json({ error: "Importação não encontrada." }, { status: 404 });
  }

  const importacao = await obterImportacaoHistorico(session.userId, id);
  if (!importacao) {
    return Response.json({ error: "Importação não encontrada." }, { status: 404 });
  }

  const retomada = await avaliarRetomadaImportacao(session.userId, bruto);
  return Response.json({ importacao, retomada });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const { id: idRaw } = await context.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    await excluirImportacaoHistorico(session.userId, id, requestMeta(_request));
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof HistoricoImportacaoError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível excluir a importação." }, { status: 500 });
  }
}
