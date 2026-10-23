import { getSession } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/types";
import { temPermissao } from "@/lib/permissions/check";
import type { AcaoPermissao, ModuloPermissao } from "@/lib/permissions/modulos";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

type RequirePermissionResult =
  | { session: SessionUser }
  | { response: Response };

export async function requirePermission(
  modulo: ModuloPermissao,
  acao: AcaoPermissao,
): Promise<RequirePermissionResult> {
  const session = await getSession();
  if (!session) {
    return { response: Response.json({ error: "Não autenticado." }, { status: 401 }) };
  }

  const permissoes = permissoesDoUsuarioId(session.userId);
  if (!temPermissao(permissoes, modulo, acao)) {
    return { response: Response.json({ error: "Sem permissão para esta ação." }, { status: 403 }) };
  }

  return { session };
}
