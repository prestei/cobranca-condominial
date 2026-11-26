import { unidadeNaFilaCobrancaAtiva, type Cadastros, type Unidade } from "@/data/catalogo";
import { unidadeEmNegociacaoOperacionalFromUnidade } from "@/lib/debitos/unidade-em-negociacao";

/** Critério de inclusão na fila operacional de `/atendimentos` (cobrança ativa, fora de negociação/acordo). */
export function unidadeElegivelFilaAtendimento(
  unidade: Pick<Unidade, "id" | "status" | "situacao">,
  cadastros: Pick<Cadastros, "propostasNegociacao" | "debitos">,
): boolean {
  if (unidade.status === "Inativa") return false;
  if (!unidadeNaFilaCobrancaAtiva(unidade)) return false;
  return !unidadeEmNegociacaoOperacionalFromUnidade(cadastros as Cadastros, unidade as Unidade);
}