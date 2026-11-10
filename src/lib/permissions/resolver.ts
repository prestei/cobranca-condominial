import { permissionsForUserId } from "@/lib/db/repositories/identity-repository";
import type { PermissoesCargo } from "@/lib/permissions/modulos";

/** Fonte única de permissões em runtime (PostgreSQL via Prisma). */
export async function resolverPermissoesUsuario(userId: number): Promise<PermissoesCargo> {
  return permissionsForUserId(userId);
}
