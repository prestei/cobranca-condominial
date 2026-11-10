import type { PermissoesCargo } from "@/lib/permissions/modulos";

export type SessionUser = {
  userId: number;
  email: string;
  nome: string;
  cargoId: number;
  /** Snapshot das permissões no JWT (origem: PostgreSQL no login/refresh). */
  permissoes?: PermissoesCargo;
};
