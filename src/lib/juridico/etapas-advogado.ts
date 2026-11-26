import { encaminhamentoJuridicoEmAndamento, statusEncaminhamentoJuridico } from "@/data/catalogo";

/** Filtro intuitivo na tela do advogado — cada etapa agrupa status oficiais do T17. */
export type EtapaJuridicoFiltro = "todos" | "entrada" | "analise" | "decisao" | "fechamento";

export type EtapaJuridicoConfig = {
  id: Exclude<EtapaJuridicoFiltro, "todos">;
  rotulo: string;
  descricaoCurta: string;
  statuses: readonly string[];
};

export const ETAPAS_JURIDICO_ADVOGADO: EtapaJuridicoConfig[] = [
  {
    id: "entrada",
    rotulo: "Entrada",
    descricaoCurta: "Aguardando início da análise",
    statuses: ["Encaminhado"],
  },
  {
    id: "analise",
    rotulo: "Análise",
    descricaoCurta: "Análise do caso e documentação",
    statuses: ["Em análise", "Documentação pendente"],
  },
  {
    id: "decisao",
    rotulo: "Decisão",
    descricaoCurta: "Definição da ação jurídica",
    statuses: ["Aguardando decisão"],
  },
  {
    id: "fechamento",
    rotulo: "Encerramento",
    descricaoCurta: "Ajuizamento, arquivo ou retorno à cobrança",
    statuses: ["Pronto para ajuizamento", "Arquivado", "Retornado à cobrança amigável"],
  },
];

const mapaStatusParaEtapa = new Map<string, Exclude<EtapaJuridicoFiltro, "todos">>();
for (const etapa of ETAPAS_JURIDICO_ADVOGADO) {
  for (const status of etapa.statuses) {
    mapaStatusParaEtapa.set(status, etapa.id);
  }
}

export function etapaDoEncaminhamento(status: string): Exclude<EtapaJuridicoFiltro, "todos"> | null {
  return mapaStatusParaEtapa.get(status) ?? null;
}

export function encaminhamentoNaEtapa(status: string, filtro: EtapaJuridicoFiltro): boolean {
  if (filtro === "todos") return true;
  return etapaDoEncaminhamento(status) === filtro;
}

/** Status visíveis ao advogado na listagem (sem pendência/rejeição da gestão). */
export const STATUS_ENCJS_ADVOGADO = statusEncaminhamentoJuridico.filter(
  (item) => item !== "Aguardando aprovação" && item !== "Rejeitado",
);

/** Passos do fluxo exibidos no resumo lateral (alinhados às etapas operacionais). */
export const PASSOS_FLUXO_JURIDICO = ETAPAS_JURIDICO_ADVOGADO.map((item) => item.rotulo);

export function indicePassoFluxo(status: string): number {
  const etapa = etapaDoEncaminhamento(status);
  if (!etapa) return 0;
  return ETAPAS_JURIDICO_ADVOGADO.findIndex((item) => item.id === etapa);
}

export function encaminhamentoAtivoParaMetrica(status: string): boolean {
  return encaminhamentoJuridicoEmAndamento(status);
}