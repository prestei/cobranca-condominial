import type { PropostaNegociacao } from "@/data/catalogo";
import type { ResumoAcordo } from "@/lib/acordos/resumo";

/** Indica se a negociação exige intervenção do advogado para análise jurídica. */
export function negociacaoExigeIntervencaoAdvogado(
  proposta: PropostaNegociacao,
  resumo?: ResumoAcordo | null,
): boolean {
  if (proposta.assuncaoJuridicaEm?.trim()) return false;

  if (proposta.status === "Em análise") return true;

  if (proposta.status === "Aceita" && resumo) {
    if (resumo.parcelasVencidas > 0) return true;
    if (resumo.potencialDescumprimento) return true;
  }

  return false;
}

export function propostaJaAssumidaJuridicamente(proposta: PropostaNegociacao): boolean {
  return Boolean(proposta.assuncaoJuridicaEm?.trim());
}