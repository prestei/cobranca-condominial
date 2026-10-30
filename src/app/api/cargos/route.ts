import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  criarCargo,
  CargoServiceError,
  listarCargos,
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

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "cargos", "ler");
  if (denied) return denied;

  try {
    const cargos = listarCargos(session.userId);
    return Response.json({ cargos });
  } catch (error) {
    if (error instanceof CargoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível listar os cargos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "cargos", "criar");
  if (denied) return denied;

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
    const cargo = criarCargo(session.userId, parsed, requestMeta(request));
    return Response.json({ cargo }, { status: 201 });
  } catch (error) {
    if (error instanceof CargoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível cadastrar o cargo." }, { status: 500 });
  }
}
