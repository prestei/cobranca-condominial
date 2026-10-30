import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  atualizarCargo,
  CargoServiceError,
  excluirCargo,
  requestMeta,
  type CargoInput,
} from "@/lib/cargos/service";
import { parsePermissoesJson } from "@/lib/permissions/parse";

function parseCargoBody(body: unknown): CargoInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const nome = typeof record.nome === "string" ? record.nome : "";
  const descricao = typeof record.descricao === "string" ? record.descricao : "";
  const permissoes =
    record.permissoes && typeof record.permissoes === "object"
      ? parsePermissoesJson(JSON.stringify(record.permissoes))
      : parsePermissoesJson(typeof record.permissaoJson === "string" ? record.permissaoJson : "{}");
  return { nome, descricao, permissoes };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "cargos", "editar");
  if (denied) return denied;

  const { id: idRaw } = await context.params;
  const cargoId = Number(idRaw);
  if (!Number.isFinite(cargoId) || cargoId <= 0) {
    return Response.json({ error: "Identificador do cargo inválido." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const parsed = parseCargoBody(body);
  if (!parsed) {
    return Response.json({ error: "Dados do cargo inválidos." }, { status: 400 });
  }

  try {
    const cargo = atualizarCargo(session.userId, cargoId, parsed, requestMeta(request));
    return Response.json({ cargo });
  } catch (error) {
    if (error instanceof CargoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível atualizar o cargo." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "cargos", "excluir");
  if (denied) return denied;

  const { id: idRaw } = await context.params;
  const cargoId = Number(idRaw);
  if (!Number.isFinite(cargoId) || cargoId <= 0) {
    return Response.json({ error: "Identificador do cargo inválido." }, { status: 400 });
  }

  try {
    excluirCargo(session.userId, cargoId, requestMeta(_request));
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof CargoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível excluir o cargo." }, { status: 500 });
  }
}
