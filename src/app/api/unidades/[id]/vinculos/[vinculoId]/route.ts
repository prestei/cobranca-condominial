import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { removerVinculo, requestMeta, UnidadeServiceError } from "@/lib/unidades/service";

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

type RouteContext = { params: Promise<{ id: string; vinculoId: string }> };

export async function DELETE(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "unidades", "editar");
  if (denied) return denied;

  const { id: rawUnidade, vinculoId: rawVinculo } = await context.params;
  const unidadeId = parseId(rawUnidade);
  const vinculoId = parseId(rawVinculo);
  if (unidadeId === null || vinculoId === null) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    removerVinculo(session.userId, unidadeId, vinculoId, requestMeta(request));
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UnidadeServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível remover o vínculo." }, { status: 500 });
  }
}
