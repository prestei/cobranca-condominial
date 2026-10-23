import { getSession } from "@/lib/auth/session";
import type { SessionUser } from "@/lib/auth/types";
import { permissoesDaSessao } from "@/lib/roles/server-permissions";
import { temPermissao } from "@/lib/permissions/check";
import type { AcaoPermissao, ModuloPermissao } from "@/lib/permissions/modulos";

type RequirePermissionResult = { session: SessionUser } | { response: Response };

export async function requirePermission(
  modulo: ModuloPermissao,
  acao: AcaoPermissao,
): Promise<RequirePermissionResult> {
  const session = await getSession();
  if (!session) {
    return { response: Response.json({ error: "Não autenticado." }, { status: 401 }) };
  }

  const permissoes = await permissoesDaSessao(session);
  if (!temPermissao(permissoes, modulo, acao)) {
    return { response: Response.json({ error: "Sem permissão para esta ação." }, { status: 403 }) };
  }

  return { session };
}

export async function requireAnyPermission(
  checks: Array<{ modulo: ModuloPermissao; acao: AcaoPermissao }>,
): Promise<RequirePermissionResult> {
  const session = await getSession();
  if (!session) {
    return { response: Response.json({ error: "Não autenticado." }, { status: 401 }) };
  }

  const permissoes = await permissoesDaSessao(session);
  const allowed = checks.some((item) => temPermissao(permissoes, item.modulo, item.acao));
  if (!allowed) {
    return { response: Response.json({ error: "Sem permissão para esta ação." }, { status: 403 }) };
  }

  return { session };
}
