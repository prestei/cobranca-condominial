import { requirePermission } from "@/lib/api/require-permission";
import { atualizarUsuario, excluirUsuario } from "@/lib/usuarios/service";
import type { UsuarioInput } from "@/lib/usuarios/types";

function parseId(value: string) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseUsuarioBody(body: unknown): UsuarioInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const cargoId = typeof record.cargoId === "number" ? record.cargoId : Number(record.cargoId);
  if (!Number.isFinite(cargoId)) return null;

  return {
    codigo: typeof record.codigo === "string" ? record.codigo : "",
    cargoId,
    nome: typeof record.nome === "string" ? record.nome : "",
    telefone: typeof record.telefone === "string" ? record.telefone : "",
    email: typeof record.email === "string" ? record.email : "",
    senha: typeof record.senha === "string" ? record.senha : undefined,
  };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("usuarios", "editar");
  if ("response" in auth) return auth.response;

  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (id === null) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
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

  const result = await atualizarUsuario(id, input, auth.session.userId);
  if (!result.ok) {
    if (result.notFound) {
      return Response.json({ error: "Colaborador não encontrado." }, { status: 404 });
    }
    return Response.json({ error: "Revise os campos.", fields: result.errors }, { status: 422 });
  }

  return Response.json({ usuario: result.usuario });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission("usuarios", "excluir");
  if ("response" in auth) return auth.response;

  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (id === null) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  const result = excluirUsuario(id, auth.session.userId);
  if (!result.ok) {
    if (result.notFound) {
      return Response.json({ error: "Colaborador não encontrado." }, { status: 404 });
    }
    return Response.json({ error: result.error }, { status: 409 });
  }

  return Response.json({ ok: true });
}
