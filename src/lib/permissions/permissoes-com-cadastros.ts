import { Cadastros } from "@/data/catalogo";
import { parsePermissoesJson, permissoesVazias } from "@/lib/permissions/parse";
import type { PermissoesCargo } from "@/lib/permissions/modulos";

/** Permissões a partir de um snapshot explícito (seguro no cliente e no servidor). */
export function permissoesDoUsuarioComCadastros(userId: number, cadastros: Cadastros): PermissoesCargo {
  const usuario = cadastros.usuarios.find((item) => item.id === userId);
  if (!usuario) return permissoesVazias();
  const cargo = cadastros.cargos.find((item) => item.id === usuario.cargoId);
  if (!cargo) return permissoesVazias();
  return parsePermissoesJson(cargo.permissaoJson);
}
