import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  PropostaNegociacaoServiceError,
  atualizarStatusPropostaNegociacao,
  obterPropostaNegociacao,
  requestMeta,
  type PropostaNegociacaoStatusInput,
} from "@/lib/negociacoes/service";

function parseStatusBody(body: unknown): PropostaNegociacaoStatusInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const status = typeof record.status === "string" ? record.status : "";
  const termosAprovados = typeof record.termosAprovados === "string" ? record.termosAprovados : undefined;
  if (!status.trim()) return null;
  return { status, termosAprovados };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "atendimentos", "ler");
  if (denied) return denied;

  const { id } = await context.params;
  if (!id?.trim()) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const proposta = obterPropostaNegociacao(session.userId, id);
    return Response.json({ proposta });
  } catch (error) {
    if (error instanceof PropostaNegociacaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar a proposta." }, { status: 500 });
  }
}

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

  const input = parseStatusBody(body);
  if (!input) {
    return Response.json({ error: "Dados de status inválidos." }, { status: 400 });
  }

  try {
    const proposta = atualizarStatusPropostaNegociacao(session.userId, id, input, requestMeta(request));
    return Response.json({ proposta });
  } catch (error) {
    if (error instanceof PropostaNegociacaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível atualizar a proposta." }, { status: 500 });
  }
}
