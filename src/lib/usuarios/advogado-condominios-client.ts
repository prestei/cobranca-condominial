import type { Condominio } from "@/data/catalogo";

/** IDs de condomínios cujo array `advogados` contém o nome (apenas catálogo já carregado no cliente). */
export function idsCondominiosDoAdvogadoNoCadastro(condominios: Condominio[], nomeAdvogado: string): number[] {
  const alvo = nomeAdvogado.trim();
  if (!alvo) return [];
  return condominios.filter((item) => item.advogados.includes(alvo)).map((item) => item.id);
}
