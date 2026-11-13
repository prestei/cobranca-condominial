import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { createSession, getSession } from "@/lib/auth/session";
import { resolverPermissoesUsuario } from "@/lib/permissions/resolver";
import {
  atualizarPerfilMinhaConta,
  obterPerfilMinhaConta,
  requestMeta,
  UsuarioServiceError,
  type MinhaContaInput,
} from "@/lib/usuarios/service";

function parseMinhaContaBody(body: unknown): MinhaContaInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const str = (key: string) => (typeof record[key] === "string" ? (record[key] as string) : "");
  const nome = str("nome");
  const email = str("email");
  const telefone = str("telefone");
  if (!nome && !email && telefone === "" && !("avatar" in record)) return null;

  let avatar: string | null | undefined;
  if ("avatar" in record) {
    if (record.avatar === null) {
      avatar = null;
    } else if (typeof record.avatar === "string") {
      avatar = record.avatar;
    } else {
      return null;
    }
  }

  return {
    nome,
    telefone,
    email,
    ...(avatar !== undefined ? { avatar } : {}),
  };
}

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const perfil = await obterPerfilMinhaConta(session.userId);
  if (!perfil) {
    return Response.json({ error: "Colaborador não encontrado." }, { status: 404 });
  }

  return Response.json({ perfil });
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parseMinhaContaBody(body);
  if (!input) {
    return Response.json({ error: "Dados da conta inválidos." }, { status: 400 });
  }

  try {
    const perfil = await atualizarPerfilMinhaConta(session.userId, input, requestMeta(request));
    const sessaoAtual = await getSession();
    const permissoes =
      sessaoAtual?.permissoes ?? (await resolverPermissoesUsuario(session.userId));
    await createSession({
      userId: session.userId,
      email: perfil.email,
      nome: perfil.nome,
      cargoId: session.cargoId,
      permissoes,
    });
    return Response.json({ perfil });
  } catch (error) {
    if (error instanceof UsuarioServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível atualizar a conta." }, { status: 500 });
  }
}
