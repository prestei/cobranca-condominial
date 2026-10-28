import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  JuridicoServiceError,
  atualizarEncaminhamentoJuridico,
  obterEncaminhamentoJuridico,
  requestMeta,
  type EncaminhamentoJuridicoAtualizacaoInput,
} from "@/lib/juridico/service";

function parseAtualizacaoBody(body: unknown): EncaminhamentoJuridicoAtualizacaoInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const input: EncaminhamentoJuridicoAtualizacaoInput = {};
  if (typeof record.status === "string") input.status = record.status;
  if (typeof record.advogadoResponsavel === "string") input.advogadoResponsavel = record.advogadoResponsavel;
  if (typeof record.observacoes === "string") input.observacoes = record.observacoes;
  if (input.status === undefined && input.advogadoResponsavel === undefined && input.observacoes === undefined) {
    return null;
  }
  return input;
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "juridico", "ler");
  if (denied) return denied;

  const { id } = await context.params;
  if (!id?.trim()) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const encaminhamento = obterEncaminhamentoJuridico(session.userId, id);
    return Response.json({ encaminhamento });
  } catch (error) {
    if (error instanceof JuridicoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar o encaminhamento." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "juridico", "editar");
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

  const input = parseAtualizacaoBody(body);
  if (!input) {
    return Response.json({ error: "Nenhum campo válido para atualização." }, { status: 400 });
  }

  try {
    const encaminhamento = atualizarEncaminhamentoJuridico(session.userId, id, input, requestMeta(request));
    return Response.json({ encaminhamento });
  } catch (error) {
    if (error instanceof JuridicoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível atualizar o encaminhamento." }, { status: 500 });
  }
}
