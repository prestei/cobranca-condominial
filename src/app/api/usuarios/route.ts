import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  criarUsuario,
  listarUsuarios,
  requestMeta,
  UsuarioServiceError,
  type UsuarioInput,
} from "@/lib/usuarios/service";

function parseUsuarioBody(body: unknown): (UsuarioInput & { id?: number }) | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const str = (key: string) => (typeof record[key] === "string" ? (record[key] as string) : "");
  const cargoId = Number(record.cargoId);
  const id = record.id !== undefined ? Number(record.id) : undefined;
  const senha = typeof record.senha === "string" ? record.senha : undefined;
  const ativo = record.ativo !== undefined ? Boolean(record.ativo) : undefined;
  const condominioIds = Array.isArray(record.condominioIds)
    ? record.condominioIds.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
    : undefined;

  return {
    ...(Number.isFinite(id) ? { id } : {}),
    codigo: str("codigo"),
    nome: str("nome"),
    telefone: str("telefone"),
    email: str("email"),
    cargoId,
    ...(ativo !== undefined ? { ativo } : {}),
    ...(condominioIds !== undefined ? { condominioIds } : {}),
    ...(senha !== undefined ? { senha } : {}),
  };
}

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "usuarios", "ler");
  if (denied) return denied;

  const usuarios = listarUsuarios();
  return Response.json({ usuarios });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "usuarios", "criar");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const parsed = parseUsuarioBody(body);
  if (!parsed) {
    return Response.json({ error: "Dados do colaborador inválidos." }, { status: 400 });
  }

  const { id, ...input } = parsed;

  try {
    const usuario = await criarUsuario(session.userId, input, { id }, requestMeta(request));
    return Response.json({ usuario }, { status: 201 });
  } catch (error) {
    if (error instanceof UsuarioServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível cadastrar o colaborador." }, { status: 500 });
  }
}
