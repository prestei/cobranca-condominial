import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  AtendimentoServiceError,
  agendarRetornoEmAtendimento,
  requestMeta,
  type RetornoAgendamentoInput,
} from "@/lib/atendimentos/service";

function parseRetornoBody(body: unknown): RetornoAgendamentoInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const dataProximaAcao = typeof record.dataProximaAcao === "string" ? record.dataProximaAcao : "";
  const proximaAcao = typeof record.proximaAcao === "string" ? record.proximaAcao : "";
  if (!dataProximaAcao.trim() || !proximaAcao.trim()) return null;
  return {
    dataProximaAcao,
    proximaAcao,
    descricao: typeof record.descricao === "string" ? record.descricao : undefined,
  };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
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

  const input = parseRetornoBody(body);
  if (!input) {
    return Response.json({ error: "Informe data e descrição do retorno." }, { status: 400 });
  }

  try {
    const atendimento = agendarRetornoEmAtendimento(session.userId, id, input, requestMeta(request));
    return Response.json({ atendimento });
  } catch (error) {
    if (error instanceof AtendimentoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível agendar o retorno." }, { status: 500 });
  }
}
