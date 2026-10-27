import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  DebitoServiceError,
  atualizarDebito,
  excluirDebito,
  obterDebito,
  requestMeta,
  type DebitoInput,
} from "@/lib/debitos/service";

function parseDebitoBody(body: unknown): DebitoInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const condominioId = Number(record.condominioId);
  const unidadeId = Number(record.unidadeId);
  if (!Number.isFinite(condominioId) || !Number.isFinite(unidadeId)) return null;
  const referencia = typeof record.referencia === "string" ? record.referencia : "";
  const dataVencimento = typeof record.dataVencimento === "string" ? record.dataVencimento : "";
  const status = typeof record.status === "string" ? record.status : "";
  return {
    condominioId,
    unidadeId,
    referencia,
    descricao: typeof record.descricao === "string" ? record.descricao : undefined,
    dataVencimento,
    valor: typeof record.valor === "string" ? record.valor : undefined,
    valorOriginal: typeof record.valorOriginal === "string" ? record.valorOriginal : undefined,
    multa: typeof record.multa === "string" ? record.multa : undefined,
    juros: typeof record.juros === "string" ? record.juros : undefined,
    correcao: typeof record.correcao === "string" ? record.correcao : undefined,
    valorAtualizado: typeof record.valorAtualizado === "string" ? record.valorAtualizado : undefined,
    status,
    dataPagamento: typeof record.dataPagamento === "string" ? record.dataPagamento : undefined,
    valorPago: typeof record.valorPago === "string" ? record.valorPago : undefined,
    origem: typeof record.origem === "string" ? record.origem : undefined,
    identificadorExterno: typeof record.identificadorExterno === "string" ? record.identificadorExterno : undefined,
  };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "debitos", "ler");
  if (denied) return denied;

  const { id: idRaw } = await context.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const debito = obterDebito(session.userId, id);
    return Response.json({ debito });
  } catch (error) {
    if (error instanceof DebitoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar o débito." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "debitos", "editar");
  if (denied) return denied;

  const { id: idRaw } = await context.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parseDebitoBody(body);
  if (!input) {
    return Response.json({ error: "Dados do débito inválidos." }, { status: 400 });
  }

  try {
    const debito = atualizarDebito(session.userId, id, input, requestMeta(request));
    return Response.json({ debito });
  } catch (error) {
    if (error instanceof DebitoServiceError) {
      return Response.json({ error: error.message, detalhes: error.detalhes }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível atualizar o débito." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "debitos", "excluir");
  if (denied) return denied;

  const { id: idRaw } = await context.params;
  const id = Number(idRaw);
  if (!Number.isFinite(id) || id <= 0) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    excluirDebito(session.userId, id, requestMeta(request));
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof DebitoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível excluir o débito." }, { status: 500 });
  }
}
