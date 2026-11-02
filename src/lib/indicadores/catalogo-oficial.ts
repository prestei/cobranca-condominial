export type AtribuicaoIndicador = "re_autor_evento" | "re_quem_concluiu" | "re_quem_agendou" | "re_carteira_vigente" | "re_carteira_na_data";

export type IndicadorOficial = {
  id: string;
  rotulo: string;
  oficial: boolean;
  fonte: string;
  formula: string;
  periodo: string;
  atribuicao: AtribuicaoIndicador;
  tratamentoEventos: string;
};

export const INDICADORES_NAO_OFICIAIS = [
  "taxa_resposta_semana",
  "eficiencia_resposta_diaria",
  "media_movel_atendimentos",
  "prioridade_ranking_condominio",
  "score_produtividade",
  "ranking_re",
  "taxa_sucesso_cobranca",
] as const;

export const CATALOGO_INDICADORES_OFICIAIS: IndicadorOficial[] = [
  {
    id: "atendimentos_registrados",
    rotulo: "Atendimentos registrados",
    oficial: true,
    fonte: "Tabela lógica `atendimentos` (catálogo persistido)",
    formula: "Contagem de atendimentos com data/hora do registro no período; atribuídos ao RE autor (`usuario_id`).",
    periodo: "Filtro `de`/`ate` inclusive por dia civil",
    atribuicao: "re_autor_evento",
    tratamentoEventos: "Registros persistidos; redistribuição de carteira não altera autoria. Correções editam o registro — a contagem reflete o estado atual.",
  },
  {
    id: "retornos_concluidos",
    rotulo: "Retornos concluídos",
    oficial: true,
    fonte: "`atendimentos.retorno_concluido_em`",
    formula: "Retornos com conclusão no período; RE de `retorno_concluido_por_id`.",
    periodo: "Data de conclusão no intervalo",
    atribuicao: "re_quem_concluiu",
    tratamentoEventos: "Exige data e autor da conclusão; retorno pendente não entra.",
  },
  {
    id: "retornos_previstos",
    rotulo: "Retornos previstos",
    oficial: true,
    fonte: "`atendimentos.data_proxima_acao`",
    formula: "Agendamentos com data prevista no período; RE de quem registrou o atendimento (`usuario_id`).",
    periodo: "Data prevista no intervalo",
    atribuicao: "re_quem_agendou",
    tratamentoEventos: "Independe do responsável atual da carteira.",
  },
  {
    id: "retornos_atrasados",
    rotulo: "Retornos atrasados",
    oficial: true,
    fonte: "`atendimentos` + `situacaoRetorno`",
    formula: "Entre retornos previstos no período, em aberto, com data prevista anterior a hoje.",
    periodo: "Data prevista no intervalo",
    atribuicao: "re_quem_agendou",
    tratamentoEventos: "Subconjunto de retornos previstos ainda pendentes.",
  },
  {
    id: "retornos_em_aberto",
    rotulo: "Retornos em aberto",
    oficial: true,
    fonte: "`atendimentos` + `situacaoRetorno`",
    formula: "Entre retornos previstos no período, pendentes com data prevista hoje ou futura.",
    periodo: "Data prevista no intervalo",
    atribuicao: "re_quem_agendou",
    tratamentoEventos: "Subconjunto de retornos previstos ainda pendentes.",
  },
  {
    id: "negociacoes_criadas",
    rotulo: "Negociações criadas",
    oficial: true,
    fonte: "`propostas_negociacao`",
    formula: "Propostas criadas no período pelo RE autor; exclui Cancelada e Recusada.",
    periodo: "`criado_em` no intervalo",
    atribuicao: "re_autor_evento",
    tratamentoEventos: "Canceladas/recusadas não entram; aceitas entram como negociação e podem gerar acordo confirmado.",
  },
  {
    id: "acoes_agendadas",
    rotulo: "Ações agendadas no registro",
    oficial: true,
    fonte: "`atendimentos`",
    formula: "Atendimentos no período em que foi informada data de retorno ou texto de próxima ação.",
    periodo: "Data/hora do atendimento no intervalo",
    atribuicao: "re_autor_evento",
    tratamentoEventos: "Mesmo registro pode contar em atendimentos e ações agendadas.",
  },
  {
    id: "acordos_confirmados",
    rotulo: "Acordos confirmados",
    oficial: true,
    fonte: "`propostas_negociacao` (status Aceita)",
    formula: "Confirmação no período; RE de `acordo_confirmado_por_id` ou autor da proposta.",
    periodo: "`acordo_confirmado_em` no intervalo",
    atribuicao: "re_quem_concluiu",
    tratamentoEventos: "Somente proposta Aceita com confirmação registrada.",
  },
  {
    id: "cobrancas_carteira",
    rotulo: "Cobranças na carteira",
    oficial: true,
    fonte: "`atribuicoes_cobranca` vigentes",
    formula: "Unidades com atribuição ativa ao RE na data da consulta (snapshot).",
    periodo: "Instante da geração (não usa de/ate)",
    atribuicao: "re_carteira_vigente",
    tratamentoEventos: "Redistribuição altera apenas este indicador, não autoria histórica.",
  },
  {
    id: "inadimplencia_total",
    rotulo: "Inadimplência total",
    oficial: true,
    fonte: "`debitos` em aberto na data-base",
    formula: "Soma de `valor_atualizado` deduplicada por `identificador_externo`.",
    periodo: "Data-base do dashboard/indicadores",
    atribuicao: "re_carteira_vigente",
    tratamentoEventos: "Escopo por permissão; valores persistidos sem recálculo de juros.",
  },
  {
    id: "retornos_agenda_resumo",
    rotulo: "Retornos pendentes (agenda)",
    oficial: true,
    fonte: "`listarRetornosAgenda`",
    formula: "Contagem por situação (atrasado, hoje, próximos, concluídos) no escopo.",
    periodo: "Estado atual da agenda",
    atribuicao: "re_carteira_vigente",
    tratamentoEventos: "Lista exibe RE da carteira atual; autoria do atendimento disponível na consulta de referência.",
  },
];

export type IndicadorProdutividadeId =
  | "atendimentos_registrados"
  | "retornos_concluidos"
  | "retornos_previstos"
  | "retornos_atrasados"
  | "retornos_em_aberto"
  | "negociacoes_criadas"
  | "acoes_agendadas"
  | "acordos_confirmados"
  | "cobrancas_carteira";

export function definicaoIndicador(id: IndicadorProdutividadeId | string): IndicadorOficial | undefined {
  return CATALOGO_INDICADORES_OFICIAIS.find((item) => item.id === id);
}

export function parseIndicadorProdutividade(valor: string | null): IndicadorProdutividadeId {
  const ids: IndicadorProdutividadeId[] = [
    "atendimentos_registrados",
    "retornos_concluidos",
    "retornos_previstos",
    "retornos_atrasados",
    "retornos_em_aberto",
    "negociacoes_criadas",
    "acoes_agendadas",
    "acordos_confirmados",
    "cobrancas_carteira",
  ];
  const alvo = valor?.trim();
  if (alvo && ids.includes(alvo as IndicadorProdutividadeId)) return alvo as IndicadorProdutividadeId;
  throw new Error("Indicador inválido para conferência.");
}
