import { podeAcessarRota } from "@/lib/permissions/check";
import { moduloDaRota, ROTAS_MODULO, type PermissoesCargo } from "@/lib/permissions/modulos";

/** Normaliza `from` da URL de login: só caminhos relativos internos. */
export function caminhoRelativoSeguro(destino: string | null | undefined): string | null {
  if (!destino) return null;
  if (!destino.startsWith("/") || destino.startsWith("//")) return null;
  return destino;
}

/**
 * Destino após login: honra `from` só se o cargo tiver `ler` naquele módulo;
 * caso contrário cai no início ou na primeira rota liberada.
 */
export function destinoSeguroAposLogin(
  destino: string | null | undefined,
  permissoes: PermissoesCargo,
): string {
  const candidato = caminhoRelativoSeguro(destino) ?? "/";
  const pathname = candidato.split("?")[0] ?? candidato;

  if (podeAcessarRota(permissoes, moduloDaRota(pathname))) {
    return candidato;
  }

  if (podeAcessarRota(permissoes, "dashboard")) {
    return "/";
  }

  for (const { prefix, modulo } of ROTAS_MODULO) {
    if (podeAcessarRota(permissoes, modulo)) {
      return prefix;
    }
  }

  return "/acesso-negado";
}
