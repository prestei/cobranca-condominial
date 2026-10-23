import { getCadastros } from "@/data/catalogo";
import { parsePermissoesJson, permissoesVazias } from "@/lib/permissions/parse";
import type { PermissoesCargo } from "@/lib/permissions/modulos";

export function permissoesDoUsuarioId(userId: number, cadastros = getCadastros()): PermissoesCargo {
  const usuario = cadastros.usuarios.find((item) => item.id === userId);
  if (!usuario) return permissoesVazias();
  const cargo = cadastros.cargos.find((item) => item.id === usuario.cargoId);
  if (!cargo) return permissoesVazias();
  return parsePermissoesJson(cargo.permissaoJson);
}
