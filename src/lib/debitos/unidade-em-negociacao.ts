import {
  situacaoCobrancaUnidade,
  type Cadastros,
  type Debito,
  type Unidade,
} from "@/data/catalogo";
import {
  debitoInadimplenciaAtiva,
  idsDebitosEmNegociacaoAtiva,
  SITUACAO_OPERACIONAL_EM_NEGOCIACAO,
  situacaoOperacionalDebito,
} from "@/lib/debitos/operational-situation";
import { propostaContaComoNegociacaoCriada } from "@/lib/indicadores/regras-evento";

/** Mesmo critério da coluna Situação na fila de atendimentos — unidade em acordo ou negociação ativa. */
export function unidadeEmNegociacaoOperacionalFromUnidade(cadastros: Cadastros, unidade: Unidade): boolean {
  if (situacaoCobrancaUnidade(unidade) === "Em acordo") return true;

  for (const proposta of cadastros.propostasNegociacao) {
    if (proposta.unidadeId !== unidade.id || !propostaContaComoNegociacaoCriada(proposta)) continue;
    if (proposta.filaNegociacaoEm?.trim()) return true;
    if (proposta.status === "Aceita") return true;
  }

  return cadastros.debitos.some(
    (debito) =>
      debito.unidadeId === unidade.id &&
      debitoInadimplenciaAtiva(debito) &&
      situacaoOperacionalDebito(debito) === SITUACAO_OPERACIONAL_EM_NEGOCIACAO,
  );
}

export function unidadeEmNegociacaoOperacional(cadastros: Cadastros, unidadeId: number): boolean {
  const unidade = cadastros.unidades.find((item) => item.id === unidadeId);
  if (!unidade) return false;
  return unidadeEmNegociacaoOperacionalFromUnidade(cadastros, unidade);
}

/** Débito no recorte Em negociação do painel (alinhado à fila e à lista expandida de atendimentos). */
export function debitoEmNegociacaoPainel(
  item: Pick<Debito, "id" | "unidadeId" | "situacaoOperacional">,
  cadastros: Cadastros,
  emNegociacaoIds?: Set<number>,
): boolean {
  const ids = emNegociacaoIds ?? idsDebitosEmNegociacaoAtiva(cadastros.propostasNegociacao);
  if (ids.has(item.id)) return true;
  if (situacaoOperacionalDebito(item) === SITUACAO_OPERACIONAL_EM_NEGOCIACAO) return true;
  return unidadeEmNegociacaoOperacional(cadastros, item.unidadeId);
}