import { type Cadastros, type Unidade } from "@/data/catalogo";
import { unidadeEmNegociacaoOperacionalFromUnidade } from "@/lib/debitos/unidade-em-negociacao";

/** Situação operacional exibida na coluna Situação da fila de atendimentos (distinta de `unit.situacao`). */
export const SITUACOES_FILA_OPERACIONAL = ["Novo", "Em cobrança", "Em negociação"] as const;

export type SituacaoFilaOperacional = (typeof SITUACOES_FILA_OPERACIONAL)[number];

/** Prioridade: negociação → atribuído → novo na carteira. */
export function situacaoOperacionalFila(
  cadastros: Cadastros,
  unidade: Unidade,
  temAtribuicaoVigente: boolean,
): SituacaoFilaOperacional {
  if (unidadeEmNegociacaoOperacionalFromUnidade(cadastros, unidade)) return "Em negociação";
  if (temAtribuicaoVigente) return "Em cobrança";
  return "Novo";
}