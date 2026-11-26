import type { AcaoProximoPassoNegociacao, DestinoAnaliseNegociacao } from "@/data/catalogo";

/** Rótulo da ação para UI e histórico (pt-BR). */
export function rotuloAcaoProximoPassoNegociacao(acao: AcaoProximoPassoNegociacao): string {
  switch (acao) {
    case "forward_negotiation_queue":
      return "Encaminhar para negociação";
    case "continue_service":
      return "Continuar atendimento";
    case "forward_analysis":
      return "Encaminhar para análise";
    default:
      return acao;
  }
}

export function rotuloDestinoAnalise(destino: DestinoAnaliseNegociacao): string {
  switch (destino) {
    case "lawyer_negotiation":
      return "Análise do advogado responsável";
    case "juridico":
      return "Encaminhamento jurídico";
    default:
      return destino;
  }
}

/** Valida combinação ação + destino de análise. */
export function validarCombinacaoProximoPasso(
  acao: string,
  destinoAnalise?: string,
): { ok: true; acao: AcaoProximoPassoNegociacao; destinoAnalise?: DestinoAnaliseNegociacao } | { ok: false; mensagem: string } {
  if (acao === "forward_negotiation_queue" || acao === "continue_service") {
    if (destinoAnalise?.trim()) {
      return { ok: false, mensagem: "Destino de análise só se aplica à opção Encaminhar para análise." };
    }
    return { ok: true, acao };
  }
  if (acao === "forward_analysis") {
    const destino = destinoAnalise?.trim();
    if (destino !== "lawyer_negotiation" && destino !== "juridico") {
      return { ok: false, mensagem: "Selecione o destino da análise." };
    }
    return { ok: true, acao, destinoAnalise: destino };
  }
  return { ok: false, mensagem: "Ação de próximo passo inválida." };
}