import { respostaErroBanco } from "@/lib/api/db-error";
import { requirePermission } from "@/lib/api/require-permission";
import { atualizarCargoPorId, excluirCargoPorId } from "@/lib/roles/service";
import { parsePermissoesJson } from "@/lib/permissions/parse";

function parseId(raw: string) {
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function parseCargoBody(body: unknown) {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const nome = typeof record.nome === "string" ? record.nome : "";
  const descricao = typeof record.descricao === "string" ? record.descricao : "";
  const permissaoJson =
    typeof record.permissaoJson === "string"
      ? record.permissaoJson
      : typeof record.permissao_json === "string"
        ? record.permissao_json
        : "{}";

  return {
    nome,
    descricao,
    permissoes: parsePermissoesJson(permissaoJson),
  };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requirePermission("cargos", "editar");
  if ("response" in auth) return auth.response;

  const { id: idRaw } = await context.params;
  const id = parseId(idRaw);
  if (id === null) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parseCargoBody(body);
  if (!input) {
    return Response.json({ error: "Dados do cargo inválidos." }, { status: 400 });
  }

  try {
    const result = await atualizarCargoPorId(id, input, auth.session.userId);
    if (!result.ok) {
      if ("notFound" in result && result.notFound) {
        return Response.json({ error: "Cargo não encontrado." }, { status: 404 });
      }
      if ("errors" in result && result.errors) {
        return Response.json({ error: "Revise os campos.", fields: result.errors }, { status: 422 });
      }
      return Response.json({ error: result.error ?? "Não foi possível atualizar o cargo." }, { status: 422 });
    }
    return Response.json({ cargo: result.cargo });
  } catch (error) {
    return respostaErroBanco(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const auth = await requirePermission("cargos", "excluir");
  if ("response" in auth) return auth.response;

  const { id: idRaw } = await context.params;
  const id = parseId(idRaw);
  if (id === null) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const result = await excluirCargoPorId(id, auth.session.userId);
    if (!result.ok) {
      if ("notFound" in result && result.notFound) {
        return Response.json({ error: "Cargo não encontrado." }, { status: 404 });
      }
      return Response.json({ error: result.error ?? "Não foi possível excluir o cargo." }, { status: 422 });
    }
    return Response.json({ ok: true });
  } catch (error) {
    return respostaErroBanco(error);
  }
}
