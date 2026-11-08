import { situacaoRetorno, type Atendimento } from "@/data/catalogo";

export function retornoFoiCancelado(item: Pick<Atendimento, "retornoCanceladoEm">) {
  return Boolean(item.retornoCanceladoEm?.trim());
}

export function retornoFoiConcluido(item: Pick<Atendimento, "retornoConcluidoEm">) {
  return Boolean(item.retornoConcluidoEm?.trim());
}

/** Retorno com agendamento ativo na agenda (não concluído nem cancelado). */
export function retornoAgendaAtivo(
  item: Pick<Atendimento, "dataProximaAcao" | "retornoConcluidoEm" | "retornoCanceladoEm" | "status">,
) {
  if (!item.dataProximaAcao?.trim()) return false;
  if (retornoFoiConcluido(item) || retornoFoiCancelado(item)) return false;
  if (item.status === "Resolvido") return false;
  return true;
}

export type SituacaoAcompanhamentoRetorno =
  | "cancelado"
  | "concluido"
  | "atrasado"
  | "hoje"
  | "proximos"
  | "futuro";

export function situacaoAcompanhamentoRetorno(
  item: Pick<Atendimento, "dataProximaAcao" | "retornoConcluidoEm" | "retornoCanceladoEm">,
  hoje?: string,
): SituacaoAcompanhamentoRetorno {
  if (retornoFoiCancelado(item)) return "cancelado";
  if (retornoFoiConcluido(item)) return "concluido";
  const situacao = situacaoRetorno(item.dataProximaAcao, hoje);
  if (situacao === "atrasado") return "atrasado";
  if (situacao === "hoje") return "hoje";
  if (situacao === "semana") return "proximos";
  return "futuro";
}
