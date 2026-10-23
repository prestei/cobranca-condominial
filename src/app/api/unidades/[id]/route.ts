import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  atualizarUnidade,
  excluirUnidade,
  obterUnidadeDetalhe,
  requestMeta,
  UnidadeServiceError,
  type UnidadeInput,
} from "@/lib/unidades/service";

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

function parseUnidadeBody(body: unknown): UnidadeInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const condominioId = Number(record.condominioId);
  const identificacao = typeof record.identificacao === "string" ? record.identificacao : "";
  const bloco = typeof record.bloco === "string" ? record.bloco : "";
  const tipo = typeof record.tipo === "string" ? record.tipo : "";
  const status = typeof record.status === "string" ? record.status : "";
  const situacao = typeof record.situacao === "string" ? record.situacao : undefined;
  if (!Number.isFinite(condominioId)) return null;
  return { condominioId, identificacao, bloco, tipo, status, situacao };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "unidades", "ler");
  if (denied) return denied;

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id === null) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const detalhe = obterUnidadeDetalhe(session.userId, id);
    return Response.json(detalhe);
  } catch (error) {
    if (error instanceof UnidadeServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível consultar a unidade." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "unidades", "editar");
  if (denied) return denied;

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id === null) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parseUnidadeBody(body);
  if (!input) {
    return Response.json({ error: "Dados da unidade inválidos." }, { status: 400 });
  }

  try {
    const unidade = atualizarUnidade(session.userId, id, input, requestMeta(request));
    return Response.json({ unidade });
  } catch (error) {
    if (error instanceof UnidadeServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível atualizar a unidade." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "unidades", "excluir");
  if (denied) return denied;

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (id === null) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    excluirUnidade(session.userId, id, requestMeta(request));
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UnidadeServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível excluir a unidade." }, { status: 500 });
  }
}
