import { temPermissao } from "@/lib/permissions/check";
import type { AcaoPermissao, PermissoesCargo } from "@/lib/permissions/modulos";

export type StatusPropostaDecisao = "Aceita" | "Recusada" | "Cancelada";

const ACAO_POR_STATUS: Record<StatusPropostaDecisao, AcaoPermissao> = {
  Aceita: "confirmar",
  Recusada: "recusar",
  Cancelada: "cancelar",
};

const MENSAGEM_POR_STATUS: Record<StatusPropostaDecisao, string> = {
  Aceita: "Sem permissão para confirmar o acordo.",
  Recusada: "Sem permissão para recusar a proposta.",
  Cancelada: "Sem permissão para cancelar a proposta.",
};

export function acaoNegociacoesParaStatusProposta(status: string): AcaoPermissao | null {
  if (status === "Aceita" || status === "Recusada" || status === "Cancelada") {
    return ACAO_POR_STATUS[status];
  }
  return null;
}

export function podeDecidirStatusProposta(permissoes: PermissoesCargo, status: string): boolean {
  const acao = acaoNegociacoesParaStatusProposta(status);
  return acao != null && temPermissao(permissoes, "negociacoes", acao);
}

export function podeDecidirPropostaEmAnalise(permissoes: PermissoesCargo): boolean {
  return (Object.values(ACAO_POR_STATUS) as AcaoPermissao[]).some((acao) =>
    temPermissao(permissoes, "negociacoes", acao),
  );
}

export function mensagemSemPermissaoDecisaoProposta(status: string): string {
  if (status === "Aceita" || status === "Recusada" || status === "Cancelada") {
    return MENSAGEM_POR_STATUS[status];
  }
  return "Sem permissão para alterar o status da proposta.";
}