import { getSession } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/types";
import { temPermissao } from "@/lib/permissions/check";
import type { AcaoPermissao, ModuloPermissao } from "@/lib/permissions/modulos";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

export async function requireSession(): Promise<SessionUser | Response> {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Sessão inválida ou expirada." }, { status: 401 });
  }
  return session;
}

export function isErrorResponse(value: SessionUser | Response): value is Response {
  return value instanceof Response;
}

export async function requirePermissao(
  session: SessionUser,
  modulo: ModuloPermissao,
  acao: AcaoPermissao,
): Promise<Response | null> {
  const perm = permissoesDoUsuarioId(session.userId);
  if (!temPermissao(perm, modulo, acao)) {
    return Response.json({ error: "Sem permissão para esta operação." }, { status: 403 });
  }
  return null;
}
