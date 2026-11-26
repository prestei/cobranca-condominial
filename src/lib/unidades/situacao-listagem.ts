import {
  unidadeComDebitoOperacional,
  unidadeNaFilaCobrancaAtiva,
  type Unidade,
} from "@/data/catalogo";

/** Rótulos da coluna Situações nas listagens de unidade (Unidades, Condomínios por condomínio). */
export const rotulosSituacaoListagemUnidade = [
  "Inadimplência prescrita",
  "Inadimplente",
  "Aguardando débitos",
  "Em dia",
] as const;

export type RotuloSituacaoListagemUnidade = (typeof rotulosSituacaoListagemUnidade)[number];

export function rotuloSituacaoListagemUnidade(
  unidade: Unidade,
  temDebitoOperacionalAberto: boolean,
  temDebitoPrescritoAberto: boolean,
): RotuloSituacaoListagemUnidade {
  if (unidadeComDebitoOperacional(unidade, temDebitoOperacionalAberto)) return "Inadimplente";
  if (temDebitoPrescritoAberto) return "Inadimplência prescrita";
  if (unidadeNaFilaCobrancaAtiva(unidade)) return "Aguardando débitos";
  return "Em dia";
}

export function variantBadgeSituacaoListagemUnidade(
  rotulo: RotuloSituacaoListagemUnidade,
): "success" | "error" | "secondary" {
  if (rotulo === "Em dia") return "success";
  if (rotulo === "Inadimplente") return "error";
  return "secondary";
}
