import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  AtendimentoServiceError,
  atualizarAtendimento,
  excluirAtendimento,
  requestMeta,
  type AtendimentoInput,
} from "@/lib/atendimentos/service";

function parseAtendimentoBody(body: unknown): AtendimentoInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const condominioId = Number(record.condominioId);
  const unidadeId = Number(record.unidadeId);
  const responsavelRaw = record.responsavelId;
  const responsavelId =
    responsavelRaw === null || responsavelRaw === undefined || responsavelRaw === ""
      ? null
      : Number(responsavelRaw);
  const canal = typeof record.canal === "string" ? record.canal : "";
  const respondeu = typeof record.respondeu === "string" ? record.respondeu : "";
  const motivo = typeof record.motivo === "string" ? record.motivo : undefined;
  const assunto = typeof record.assunto === "string" ? record.assunto : undefined;
  const descricao = typeof record.descricao === "string" ? record.descricao : undefined;
  const status = typeof record.status === "string" ? record.status : "";
  const dataProximaAcao = typeof record.dataProximaAcao === "string" ? record.dataProximaAcao : undefined;
  const proximaAcao = typeof record.proximaAcao === "string" ? record.proximaAcao : undefined;
  if (!Number.isFinite(condominioId) || !Number.isFinite(unidadeId)) return null;
  return {
    condominioId,
    unidadeId,
    responsavelId: Number.isFinite(responsavelId) ? responsavelId : null,
    canal,
    respondeu,
    motivo,
    assunto,
    descricao,
    status,
    dataProximaAcao,
    proximaAcao,
  };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "atendimentos", "editar");
  if (denied) return denied;

  const { id } = await context.params;
  if (!id?.trim()) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parseAtendimentoBody(body);
  if (!input) {
    return Response.json({ error: "Dados do atendimento inválidos." }, { status: 400 });
  }

  try {
    const atendimento = atualizarAtendimento(session.userId, id, input, requestMeta(request));
    return Response.json({ atendimento });
  } catch (error) {
    if (error instanceof AtendimentoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível atualizar o atendimento." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "atendimentos", "excluir");
  if (denied) return denied;

  const { id } = await context.params;
  if (!id?.trim()) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    excluirAtendimento(session.userId, id, requestMeta(request));
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof AtendimentoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível excluir o atendimento." }, { status: 500 });
  }
}
