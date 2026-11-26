import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { requirePropostaCriar } from "@/lib/api/require-proposta-auth";
import {
  NegociacaoProximoPassoError,
  confirmarProximoPassoNegociacao,
  montarResumoProximoPassoNegociacao,
  requestMeta,
  type NegociacaoProximoPassoInput,
} from "@/lib/negociacoes/next-step-decision";
import { PropostaNegociacaoServiceError } from "@/lib/negociacoes/service";

function parseBody(body: unknown): NegociacaoProximoPassoInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const acao = typeof record.acao === "string" ? record.acao : "";
  const idempotencyKey = typeof record.idempotencyKey === "string" ? record.idempotencyKey : "";
  const confirmado = record.confirmado === true;
  const observacoes = typeof record.observacoes === "string" ? record.observacoes : undefined;
  const destinoAnalise = typeof record.destinoAnalise === "string" ? record.destinoAnalise : undefined;
  const advogadoResponsavel =
    typeof record.advogadoResponsavel === "string" ? record.advogadoResponsavel : undefined;
  const resumoContexto = typeof record.resumoContexto === "string" ? record.resumoContexto : undefined;
  if (!acao.trim() || !idempotencyKey.trim()) return null;
  return {
    acao,
    confirmado,
    idempotencyKey,
    observacoes,
    destinoAnalise,
    advogadoResponsavel,
    resumoContexto,
  };
}

type RouteContext = { params: Promise<{ id: string }> };

/** Pré-visualização do resumo (sem confirmar). */
export async function GET(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePropostaCriar(session);
  if (denied) return denied;

  const { id } = await context.params;
  if (!id?.trim()) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const acao = searchParams.get("acao") ?? "";
  const destinoAnalise = searchParams.get("destinoAnalise") ?? undefined;
  const advogadoResponsavel = searchParams.get("advogadoResponsavel") ?? undefined;

  try {
    const resumo = await montarResumoProximoPassoNegociacao(session.userId, id, {
      acao,
      destinoAnalise,
      advogadoResponsavel,
    });
    return Response.json({ resumo });
  } catch (error) {
    if (error instanceof NegociacaoProximoPassoError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível montar o resumo." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePropostaCriar(session);
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

  const input = parseBody(body);
  if (!input) {
    return Response.json({ error: "Dados do próximo passo inválidos." }, { status: 400 });
  }

  try {
    const resultado = await confirmarProximoPassoNegociacao(session.userId, id, input, requestMeta(request));
    return Response.json(resultado);
  } catch (error) {
    if (error instanceof NegociacaoProximoPassoError) {
      return Response.json({ error: error.message, detalhes: error.detalhes }, { status: error.status });
    }
    if (error instanceof PropostaNegociacaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível confirmar o próximo passo." }, { status: 500 });
  }
}