import { temPermissao } from "@/lib/permissions/check";
import type { PermissoesCargo } from "@/lib/permissions/modulos";

export type PerfilOperacional = "administradora" | "atendente" | "advogado";

/** Alias usado pelo dashboard e pela API. */
export type DashboardPerfil = PerfilOperacional;

/** Mesma regra de `resolverPerfil` em `lib/dashboard/service.ts` (UI e API alinhados). */
export function resolverPerfilOperacional(permissoes: PermissoesCargo): PerfilOperacional {
  if (temPermissao(permissoes, "usuarios", "criar")) return "administradora";
  if (temPermissao(permissoes, "juridico", "ler") && temPermissao(permissoes, "condominios", "ler")) return "advogado";
  return "atendente";
}
