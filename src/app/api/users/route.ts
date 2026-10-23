import { respostaErroBanco } from "@/lib/api/db-error";
import { requirePermission } from "@/lib/api/require-permission";
import { criarUsuario, listarUsuariosPublicos } from "@/lib/users/service";
import type { UsuarioInput } from "@/lib/users/types";

function parseUsuarioBody(body: unknown): UsuarioInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const cargoId = typeof record.cargoId === "number" ? record.cargoId : Number(record.cargoId);
  if (!Number.isFinite(cargoId)) return null;

  return {
    codigo: typeof record.codigo === "string" ? record.codigo : "",
    cargoId,
    nome: typeof record.nome === "string" ? record.nome : "",
    cpf: typeof record.cpf === "string" ? record.cpf : "",
    dataNascimento: typeof record.dataNascimento === "string" ? record.dataNascimento : "",
    telefone: typeof record.telefone === "string" ? record.telefone : "",
    email: typeof record.email === "string" ? record.email : "",
    senha: typeof record.senha === "string" ? record.senha : undefined,
  };
}

export async function GET() {
  const auth = await requirePermission("usuarios", "ler");
  if ("response" in auth) return auth.response;

  try {
    const usuarios = await listarUsuariosPublicos();
    return Response.json({ usuarios });
  } catch (error) {
    return respostaErroBanco(error);
  }
}

export async function POST(request: Request) {
  const auth = await requirePermission("usuarios", "criar");
  if ("response" in auth) return auth.response;

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
    const result = await criarUsuario(input, auth.session.userId);
    if (!result.ok) {
      return Response.json({ error: "Revise os campos.", fields: result.errors }, { status: 422 });
    }

    return Response.json({ usuario: result.usuario }, { status: 201 });
  } catch (error) {
    return respostaErroBanco(error);
  }
}
