import { getCadastros } from "@/lib/catalog";
import { parsePermissoesJson, permissoesVazias } from "@/lib/permissions/parse";
import type { PermissoesCargo } from "@/lib/permissions/modulos";

export function permissoesDoUsuarioId(
  userId: number,
  cadastros = getCadastros(),
  cargoIdFallback?: number,
): PermissoesCargo {
  const usuario = cadastros.usuarios.find((item) => item.id === userId);
  const cargoId = usuario?.cargoId ?? cargoIdFallback;
  if (!cargoId) return permissoesVazias();
  const cargo = cadastros.cargos.find((item) => item.id === cargoId);
  if (!cargo) return permissoesVazias();
  return parsePermissoesJson(cargo.permissaoJson);
}
