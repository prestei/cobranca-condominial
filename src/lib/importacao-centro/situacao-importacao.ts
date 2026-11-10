import type { ContadoresImportacao } from "@/lib/importacao-centro/types";
import type { ResumoAprovacaoImportacao } from "@/lib/importacao-centro/resumo-aprovacao";

export const SITUACOES_IMPORTACAO = [
  "Em processamento",
  "Aguardando conferencia",
  "Aguardando aprovacao",
  "Aprovada",
  "Concluida",
  "Concluida parcialmente",
  "Cancelada",
  "Rejeitada",
  "Falhou",
] as const;

export type SituacaoImportacao = (typeof SITUACOES_IMPORTACAO)[number];

const LEGADO_PARA_SITUACAO: Record<string, SituacaoImportacao> = {
  Processando: "Em processamento",
  Erro: "Falhou",
};

export function normalizarSituacaoImportacao(status: string): SituacaoImportacao {
  const trimmed = status.trim();
  if ((SITUACOES_IMPORTACAO as readonly string[]).includes(trimmed)) {
    return trimmed as SituacaoImportacao;
  }
  return LEGADO_PARA_SITUACAO[trimmed] ?? "Em processamento";
}

export function importacaoConcluidaOuParcial(status: string): boolean {
  const sit = normalizarSituacaoImportacao(status);
  return sit === "Concluida" || sit === "Concluida parcialmente" || sit === "Aprovada";
}

function contarLinhasNaoGravadasPorProblema(contadores: ContadoresImportacao): number {
  return (
    contadores.erros +
    contadores.ignorados +
    contadores.revisoes +
    contadores.manualProtegido
  );
}

/** Situação final com base nos contadores reais da gravação (duplicados não indicam parcial). */
export function resolverSituacaoFinalImportacao(params: {
  contadores: ContadoresImportacao;
  importacaoParcial: boolean;
  idempotente?: boolean;
}): SituacaoImportacao {
  const gravados = params.contadores.novos + params.contadores.atualizacoes;
  const exclusoesPorProblema = contarLinhasNaoGravadasPorProblema(params.contadores);

  if (gravados === 0 && params.contadores.erros > 0) {
    return "Falhou";
  }
  if (gravados > 0 && exclusoesPorProblema > 0) {
    return "Concluida parcialmente";
  }
  if (gravados > 0 || params.idempotente) {
    return "Concluida";
  }
  if (params.contadores.erros > 0) {
    return "Falhou";
  }
  return "Concluida";
}

/** Sucesso operacional na UI: gravou o previsto; só duplicados/ignorados esperados não contam como falha. */
export function importacaoGravacaoSemExclusaoPorProblema(contadores: {
  novos: number;
  atualizados: number;
  erros: number;
  manualProtegido?: number;
}): boolean {
  const gravados = contadores.novos + contadores.atualizados;
  if (gravados === 0) return false;
  const manual = contadores.manualProtegido ?? 0;
  return contadores.erros === 0 && manual === 0;
}

export function rotuloSituacaoImportacao(status: string): string {
  const sit = normalizarSituacaoImportacao(status);
  const rotulos: Record<SituacaoImportacao, string> = {
    "Em processamento": "Em processamento",
    "Aguardando conferencia": "Em conferência",
    "Aguardando aprovacao": "Em conferência",
    Aprovada: "Aprovada",
    Concluida: "Concluída",
    "Concluida parcialmente": "Concluída parcialmente",
    Cancelada: "Cancelada",
    Rejeitada: "Rejeitada",
    Falhou: "Falhou",
  };
  return rotulos[sit] ?? status;
}

export function badgeVariantSituacaoImportacao(
  status: string,
): "primary" | "success" | "error" | "secondary" | "neutral" {
  const sit = normalizarSituacaoImportacao(status);
  switch (sit) {
    case "Em processamento":
    case "Aguardando conferencia":
    case "Aguardando aprovacao":
      return "primary";
    case "Aprovada":
    case "Concluida":
      return "success";
    case "Concluida parcialmente":
      return "neutral";
    case "Falhou":
    case "Rejeitada":
      return "error";
    case "Cancelada":
    default:
      return "secondary";
  }
}

export type ResumoInconsistenciasImportacao = {
  erros: number;
  atencao: number;
  duplicados: number;
  revisoes: number;
  manualProtegido: number;
  ignorados: number;
  amostra: Array<{ linha: number; mensagem: string }>;
};

export function montarResumoInconsistencias(params: {
  contadores: ContadoresImportacao;
  contagensPrevia?: { erros: number; atencao: number };
  relatorio?: {
    erros?: Array<{ linha: number; mensagem: string }>;
    ignorados?: Array<{ linha: number; mensagem: string }>;
  };
}): ResumoInconsistenciasImportacao {
  const erros = params.contagensPrevia?.erros ?? params.contadores.erros;
  const atencao = params.contagensPrevia?.atencao ?? 0;
  const amostra: Array<{ linha: number; mensagem: string }> = [];
  const pushAmostra = (items?: Array<{ linha: number; mensagem: string }>) => {
    if (!items) return;
    for (const item of items) {
      if (amostra.length >= 25) break;
      amostra.push({ linha: item.linha, mensagem: item.mensagem });
    }
  };
  pushAmostra(params.relatorio?.erros);
  pushAmostra(params.relatorio?.ignorados);

  return {
    erros,
    atencao,
    duplicados: params.contadores.duplicados,
    revisoes: params.contadores.revisoes,
    manualProtegido: params.contadores.manualProtegido,
    ignorados: params.contadores.ignorados,
    amostra,
  };
}

export function resultadoFinanceiroDeResumo(
  resumo?: Pick<ResumoAprovacaoImportacao, "totalFinanceiro">,
): { valor: string; moeda: "BRL" } | undefined {
  if (!resumo?.totalFinanceiro) return undefined;
  return resumo.totalFinanceiro;
}
