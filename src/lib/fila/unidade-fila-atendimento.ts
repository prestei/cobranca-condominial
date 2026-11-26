import { unidadeNaFilaCobrancaAtiva, type Cadastros, type Unidade } from "@/data/catalogo";
import { propostaContaComoAcordoConfirmado } from "@/lib/indicadores/regras-evento";

/** Critério de inclusão na fila operacional de `/atendimentos` (cobrança ativa sem acordo já confirmado). */
export function unidadeElegivelFilaAtendimento(
  unidade: Pick<Unidade, "id" | "status" | "situacao">,
  cadastros: Pick<Cadastros, "propostasNegociacao">,
): boolean {
  if (unidade.status === "Inativa") return false;
  if (!unidadeNaFilaCobrancaAtiva(unidade)) return false;
  return !cadastros.propostasNegociacao.some(
    (proposta) => proposta.unidadeId === unidade.id && propostaContaComoAcordoConfirmado(proposta),
  );
}