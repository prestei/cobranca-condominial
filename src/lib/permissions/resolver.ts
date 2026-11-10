import { identityPgDisponivel, permissoesDoUsuarioIdPg } from "@/lib/db/identity-pg";
import { permissoesVazias } from "@/lib/permissions/parse";
import type { PermissoesCargo } from "@/lib/permissions/modulos";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

/**
 * Fonte única de permissões em runtime.
 * Com DATABASE_URL: apenas PostgreSQL (`role.permissao_json`) — sem fallback para seed/memória.
 * Sem DATABASE_URL (dev/teste): catálogo em processo.
 */
export async function resolverPermissoesUsuario(userId: number): Promise<PermissoesCargo> {
  if (identityPgDisponivel()) {
    const doPg = await permissoesDoUsuarioIdPg(userId);
    return doPg ?? permissoesVazias();
  }
  return permissoesDoUsuarioId(userId);
}
