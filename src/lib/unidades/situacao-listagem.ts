import {
  unidadeComDebitoOperacional,
  unidadeNaFilaCobrancaAtiva,
  unidadePrescrita,
  type Unidade,
} from "@/data/catalogo";

/** Rótulos da coluna Situações nas listagens de unidade (Unidades, Condomínios por condomínio). */
export const rotulosSituacaoListagemUnidade = [
  "Unidade prescrita",
  "Inadimplente",
  "Aguardando débitos",
  "Em dia",
] as const;

export type RotuloSituacaoListagemUnidade = (typeof rotulosSituacaoListagemUnidade)[number];

export function rotuloSituacaoListagemUnidade(
  unidade: Unidade,
  temDebitoVencidoAberto: boolean,
): RotuloSituacaoListagemUnidade {
  if (unidadePrescrita(unidade)) return "Unidade prescrita";
  if (unidadeComDebitoOperacional(unidade, temDebitoVencidoAberto)) return "Inadimplente";
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
