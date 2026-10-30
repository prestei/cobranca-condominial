import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  atualizarUsuario,
  excluirUsuario,
  requestMeta,
  UsuarioServiceError,
  type UsuarioInput,
} from "@/lib/usuarios/service";

function parseUsuarioBody(body: unknown): UsuarioInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const str = (key: string) => (typeof record[key] === "string" ? (record[key] as string) : "");
  const cargoId = Number(record.cargoId);
  const senha = typeof record.senha === "string" ? record.senha : undefined;
  const ativo = record.ativo !== undefined ? Boolean(record.ativo) : undefined;
  const condominioIds = Array.isArray(record.condominioIds)
    ? record.condominioIds.map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0)
    : undefined;

  return {
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

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "usuarios", "excluir");
  if (denied) return denied;

  const { id: idParam } = await context.params;
  const usuarioId = Number(idParam);
  if (!Number.isFinite(usuarioId)) {
    return Response.json({ error: "Colaborador inválido." }, { status: 400 });
  }

  try {
    excluirUsuario(session.userId, usuarioId, requestMeta(_request));
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof UsuarioServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível excluir o colaborador." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "usuarios", "editar");
  if (denied) return denied;

  const { id: idParam } = await context.params;
  const usuarioId = Number(idParam);
  if (!Number.isFinite(usuarioId)) {
    return Response.json({ error: "Colaborador inválido." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parseUsuarioBody(body);
  if (!input) {
    return Response.json({ error: "Dados do colaborador inválidos." }, { status: 400 });
  }

  try {
    const usuario = await atualizarUsuario(session.userId, usuarioId, input, requestMeta(request));
    return Response.json({ usuario });
  } catch (error) {
    if (error instanceof UsuarioServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível atualizar o colaborador." }, { status: 500 });
  }
}
