import { buscarCargoPorId } from "@/lib/roles/repository";
import { parsePermissoesJson, permissoesVazias } from "@/lib/permissions/parse";
import type { PermissoesCargo } from "@/lib/permissions/modulos";
import type { SessionUser } from "@/lib/auth/types";

export async function permissoesDaSessao(session: SessionUser): Promise<PermissoesCargo> {
  const cargo = await buscarCargoPorId(session.cargoId);
  if (!cargo) return permissoesVazias();
  return parsePermissoesJson(cargo.permissaoJson);
}
