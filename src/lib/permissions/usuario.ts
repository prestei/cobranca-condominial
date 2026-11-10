import type { Cadastros } from "@/data/catalogo";
import { tryGetRequestCatalog } from "@/lib/db/request-catalog";
import { parsePermissoesJson, permissoesVazias } from "@/lib/permissions/parse";
import type { PermissoesCargo } from "@/lib/permissions/modulos";

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
  cadastros = base;
  const usuario = cadastros.usuarios.find((item) => item.id === userId);
  if (!usuario) return permissoesVazias();
  const cargo = cadastros.cargos.find((item) => item.id === usuario.cargoId);
  if (!cargo) return permissoesVazias();
  return parsePermissoesJson(cargo.permissaoJson);
}
