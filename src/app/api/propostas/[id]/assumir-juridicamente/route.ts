import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { requirePropostaLer } from "@/lib/api/require-proposta-auth";
import {
  AssumirJuridicamenteError,
  assumirJuridicamenteNegociacao,
} from "@/lib/negociacoes/assumir-juridicamente";
import { PropostaNegociacaoServiceError, requestMeta } from "@/lib/negociacoes/service";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePropostaLer(session);
  if (denied) return denied;

  const { id } = await context.params;
  if (!id?.trim()) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const resultado = await assumirJuridicamenteNegociacao(session.userId, id, requestMeta(request));
    return Response.json(resultado);
  } catch (error) {
    if (error instanceof AssumirJuridicamenteError) {
      return Response.json({ error: error.message, detalhes: error.detalhes }, { status: error.status });
    }
    if (error instanceof PropostaNegociacaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível assumir juridicamente." }, { status: 500 });
  }
}