import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { AtendimentoServiceError, cancelarRetornoAgendado, requestMeta } from "@/lib/atendimentos/service";

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

  const justificativa =
    body && typeof body === "object" && typeof (body as Record<string, unknown>).justificativa === "string"
      ? (body as Record<string, string>).justificativa
      : "";

  try {
    const atendimento = cancelarRetornoAgendado(session.userId, id, justificativa, requestMeta(request));
    return Response.json({ atendimento });
  } catch (error) {
    if (error instanceof AtendimentoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível cancelar o retorno." }, { status: 500 });
  }
}
