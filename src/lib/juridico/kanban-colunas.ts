/** Colunas do Kanban na visão do advogado — agrupam status oficiais T17. */

export type ColunaKanbanJuridicoId =
  | "para_analise"
  | "em_andamento"
  | "acao_definida"
  | "em_processo";

export type ColunaKanbanJuridico = {
  id: ColunaKanbanJuridicoId;
  rotulo: string;
  statuses: readonly string[];
  headerClassName: string;
  contadorClassName: string;
  pillCard: {
    fundo: string;
    texto: string;
    ponto: string;
  };
};

export const COLUNAS_KANBAN_JURIDICO: readonly ColunaKanbanJuridico[] = [
  {
    id: "para_analise",
    rotulo: "Para Análise",
    statuses: ["Encaminhado"],
    headerClassName: "bg-primary-container text-on-primary",
    contadorClassName: "bg-on-primary/15 text-on-primary",
    pillCard: {
      fundo: "bg-primary-fixed",
      texto: "text-on-primary-fixed",
      ponto: "bg-primary-container",
    },
  },
  {
    id: "em_andamento",
    rotulo: "Em Andamento",
    statuses: ["Em análise", "Documentação pendente"],
    headerClassName: "bg-secondary-container text-on-secondary-fixed",
    contadorClassName: "bg-on-secondary-fixed/15 text-on-secondary-fixed",
    pillCard: {
      fundo: "bg-secondary-fixed/45",
      texto: "text-on-secondary-fixed-variant",
      ponto: "bg-secondary",
    },
  },
  {
    id: "acao_definida",
    rotulo: "Com Ação Definida",
    statuses: ["Aguardando decisão"],
    headerClassName: "bg-status-settled text-on-primary",
    contadorClassName: "bg-on-primary/15 text-on-primary",
    pillCard: {
      fundo: "bg-badge-success-subtle",
      texto: "text-badge-success-emphasis",
      ponto: "bg-status-settled",
    },
  },
  {
    id: "em_processo",
    rotulo: "Em Processo",
    statuses: ["Pronto para ajuizamento"],
    headerClassName: "bg-tertiary-container text-on-tertiary-container",
    contadorClassName: "bg-on-tertiary-container/15 text-on-tertiary-container",
    pillCard: {
      fundo: "bg-tertiary-fixed/55",
      texto: "text-on-tertiary-fixed-variant",
      ponto: "bg-tertiary-container",
    },
  },
];

export const STATUS_ENCERRADOS_JURIDICO = ["Arquivado", "Retornado à cobrança amigável"] as const;

const mapaStatusColuna = new Map<string, ColunaKanbanJuridicoId>();
for (const coluna of COLUNAS_KANBAN_JURIDICO) {
  for (const status of coluna.statuses) {
    mapaStatusColuna.set(status, coluna.id);
  }
}

export function colunaKanbanDoStatus(status: string): ColunaKanbanJuridicoId | null {
  return mapaStatusColuna.get(status) ?? null;
}

export function configColunaKanban(status: string): ColunaKanbanJuridico | null {
  const id = colunaKanbanDoStatus(status);
  if (!id) return null;
  return COLUNAS_KANBAN_JURIDICO.find((item) => item.id === id) ?? null;
}

export function encaminhamentoNoKanban(status: string): boolean {
  return colunaKanbanDoStatus(status) !== null;
}

/** Rótulo curto no card do Kanban */
export type AcaoRapidaKanban = {
  rotulo: string;
  proximoStatus: string;
};

/** CTA do card → abre sheet na aba Ação com `proximoStatus` pré-selecionado (não altera status sozinho). */
export function acaoRapidaKanban(status: string): AcaoRapidaKanban | null {
  if (status === "Encaminhado") {
    return { rotulo: "Confirmar análise", proximoStatus: "Em análise" };
  }
  if (status === "Em análise") {
    return { rotulo: "Registrar decisão", proximoStatus: "Aguardando decisão" };
  }
  if (status === "Documentação pendente") {
    return { rotulo: "Retomar análise", proximoStatus: "Em análise" };
  }
  if (status === "Aguardando decisão") {
    return { rotulo: "Enviar para processo", proximoStatus: "Pronto para ajuizamento" };
  }
  if (status === "Pronto para ajuizamento") {
    return { rotulo: "Finalizar caso", proximoStatus: "Arquivado" };
  }
  return null;
}

export function rotuloBadgeKanban(status: string): string {
  if (status === "Encaminhado") return "Novo";
  if (status === "Aguardando decisão") return "Ação definida";
  if (status === "Pronto para ajuizamento") return "Em processo";
  if (status === "Arquivado") return "Finalizado";
  if (status === "Retornado à cobrança amigável") return "Retornado";
  if (status === "Em análise") return "Em análise";
  if (status === "Documentação pendente") return "Doc. pendente";
  return status;
}

export const PASSOS_FLUXO_KANBAN_JURIDICO = ["Análise", "Ação", "Processo", "Finalizado"] as const;

/** Índice do passo ativo no detalhe lateral (0–3). */
export function indicePassoKanban(status: string): number {
  const coluna = colunaKanbanDoStatus(status);
  if (coluna === "para_analise" || coluna === "em_andamento") return 0;
  if (coluna === "acao_definida") return 1;
  if (coluna === "em_processo") return 2;
  if ((STATUS_ENCERRADOS_JURIDICO as readonly string[]).includes(status)) return 3;
  return 0;
}