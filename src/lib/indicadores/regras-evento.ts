import type { Atendimento, PropostaNegociacao } from "@/data/catalogo";

/** Período inclusivo por data civil (AAAA-MM-DD), alinhado a relatórios e produtividade. */
export function diaDentroDoPeriodo(dataIso: string, de: string, ate: string) {
  const dia = dataIso.slice(0, 10);
  if (!dia) return false;
  if (de && dia < de) return false;
  if (ate && dia > ate) return false;
  return true;
}

/** Atendimentos persistidos entram nas contagens; não há estado “cancelado” no protótipo. */
export function atendimentoElegivelIndicador(_item: Atendimento) {
  return true;
}

/** Negociação criada: exclui propostas canceladas ou recusadas. */
export function propostaContaComoNegociacaoCriada(proposta: PropostaNegociacao) {
  return proposta.status !== "Cancelada" && proposta.status !== "Recusada";
}

/** Acordo confirmado: apenas proposta aceita com data de confirmação. */
export function propostaContaComoAcordoConfirmado(proposta: PropostaNegociacao) {
  return proposta.status === "Aceita" && Boolean(proposta.acordoConfirmadoEm?.trim());
}
