import { Cadastros } from "@/data/catalogo";
import { tryGetRequestCatalog } from "@/lib/db/request-catalog";
import type { PermissoesCargo } from "@/lib/permissions/modulos";
import { permissoesDoUsuarioComCadastros } from "@/lib/permissions/permissoes-com-cadastros";

export { resolverPermissoesUsuario } from "@/lib/permissions/resolver";

/**
 * Leitura síncrona do catálogo em memória (legado — UI e módulos ainda não migrados).
 * Para checagens de identidade/cargos no servidor, prefira `resolverPermissoesUsuario`.
 */
export function permissoesDoUsuarioId(userId: number, cadastros?: Cadastros): PermissoesCargo {
  const base = cadastros ?? tryGetRequestCatalog();
  if (!base) {
    throw new Error("permissoesDoUsuarioId exige cadastros explícitos fora do escopo de importação.");
  }
  return permissoesDoUsuarioComCadastros(userId, base);
}
