import { respostaErroBanco } from "@/lib/api/db-error";
import { requireAnyPermission, requirePermission } from "@/lib/api/require-permission";
import { criarCargo, listarCargosPublicos } from "@/lib/roles/service";
import { parsePermissoesJson } from "@/lib/permissions/parse";

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

export async function GET() {
  const auth = await requireAnyPermission([
    { modulo: "cargos", acao: "ler" },
    { modulo: "usuarios", acao: "ler" },
    { modulo: "usuarios", acao: "criar" },
    { modulo: "usuarios", acao: "editar" },
  ]);
  if ("response" in auth) return auth.response;

  try {
    const cargos = await listarCargosPublicos();
    return Response.json({ cargos });
  } catch (error) {
    return respostaErroBanco(error);
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission("cargos", "criar");
  if ("response" in auth) return auth.response;

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
    const result = await criarCargo(input, auth.session.userId);
    if (!result.ok) {
      if ("errors" in result && result.errors) {
        return Response.json({ error: "Revise os campos.", fields: result.errors }, { status: 422 });
      }
      return Response.json({ error: result.error ?? "Não foi possível cadastrar o cargo." }, { status: 422 });
    }
    return Response.json({ cargo: result.cargo }, { status: 201 });
  } catch (error) {
    return respostaErroBanco(error);
  }
}
