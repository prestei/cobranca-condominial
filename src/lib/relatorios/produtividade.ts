import {
  escopoCondominios,
  formatarData,
  getCadastros,
  hojeIso,
  type Condominio,
} from "@/data/catalogo";
import { codigoReDoUsuario, listarAtendentesComRe } from "@/lib/colaboradores/re";
import type { IndicadorProdutividadeId } from "@/lib/indicadores/catalogo-oficial";
import { geradoEmBr } from "@/lib/indicadores/meta";
import { listarEventosProdutividade } from "@/lib/indicadores/produtividade-eventos";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";
import type { RelatorioFiltros } from "@/lib/relatorios/service";
import { RelatorioServiceError, rotulosFiltrosAplicados } from "@/lib/relatorios/service";

export const SERIES_GRAFICO_PRODUTIVIDADE = [
  { id: "atendimentos", rotulo: "Atendimentos" },
  { id: "retornos", rotulo: "Retornos concluídos" },
  { id: "negociacoes", rotulo: "Negociações" },
  { id: "acoes", rotulo: "Ações agendadas" },
  { id: "acordos", rotulo: "Acordos confirmados" },
] as const;

export const DEFINICOES_INDICADORES_PRODUTIVIDADE = [
  "Atendimentos registrados: tentativas de cobrança gravadas pelo RE autor do registro (data/hora do atendimento dentro do período).",
  "Retornos concluídos: retornos marcados como concluídos no período (data de conclusão), atribuídos ao RE que concluiu a ação.",
  "Negociações: propostas de negociação criadas no período pelo RE autor do registro (exclui canceladas e recusadas).",
  "Ações agendadas: atendimentos registrados no período pelo RE em que foi definida data de retorno ou próxima ação.",
  "Acordos confirmados: propostas aceitas com confirmação no período, atribuídas ao RE que confirmou o acordo (quando informado).",
  "Retornos previstos: agendamentos com data prevista no período, atribuídos ao RE que registrou o atendimento (independente do responsável atual da carteira).",
  "Retornos atrasados: entre os retornos previstos no período, os que seguem em aberto com data prevista anterior a hoje (RE que agendou).",
  "Retornos em aberto: entre os retornos previstos no período, os que seguem em aberto com data prevista hoje ou futura (RE que agendou).",
  "Cobranças na carteira: unidades com atribuição vigente ao RE na data da consulta (snapshot atual).",
  "Responsável atual da carteira ≠ autor do evento: redistribuição altera só a carteira vigente; autoria histórica permanece no RE que registrou.",
] as const;

export type ProdutividadePorReLinha = {
  codigoRe: string;
  atendimentosRegistrados: number;
  retornosPrevistos: number;
  retornosConcluidos: number;
  retornosAtrasados: number;
  retornosEmAberto: number;
  negociacoesRegistradas: number;
  acoesRegistradas: number;
  cobrancasAtribuidas: number;
  acordosConfirmados: number;
  porMeio: Record<string, number>;
};

export function valoresSeriesGraficoProdutividade(linha: ProdutividadePorReLinha): number[] {
  return [
    linha.atendimentosRegistrados,
    linha.retornosConcluidos,
    linha.negociacoesRegistradas,
    linha.acoesRegistradas,
    linha.acordosConfirmados,
  ];
}

export type PainelProdutividadePorRe = {
  periodo: { de: string; ate: string; rotulo: string };
  definicoes: readonly string[];
  meta: { geradoEm: string; filtros: string[] };
  linhas: ProdutividadePorReLinha[];
  totais: Omit<ProdutividadePorReLinha, "codigoRe" | "porMeio"> & { porMeio: Record<string, number> };
};

const INDICADORES_PAINEL: IndicadorProdutividadeId[] = [
  "atendimentos_registrados",
  "retornos_previstos",
  "retornos_concluidos",
  "retornos_atrasados",
  "retornos_em_aberto",
  "negociacoes_criadas",
  "acoes_agendadas",
  "cobrancas_carteira",
  "acordos_confirmados",
];

function contarEventos(userId: number, filtros: RelatorioFiltros, indicador: IndicadorProdutividadeId) {
  return listarEventosProdutividade(userId, filtros, indicador).length;
}

function usuarioIdsPorRe(codigoRe: string): number[] {
  const alvo = codigoRe.trim().toUpperCase();
  return getCadastros()
    .usuarios.filter((item) => codigoReDoUsuario(item)?.toUpperCase() === alvo)
    .map((item) => item.id);
}

function combinaCarteira(condominio: Condominio | undefined, filtros: RelatorioFiltros) {
  if (!condominio) return false;
  if (filtros.advogado !== "todos" && !condominio.advogados.includes(filtros.advogado)) return false;
  if (filtros.condominioId != null && condominio.id !== filtros.condominioId) return false;
  return true;
}

export function podeAcessarPainelProdutividadeGlobal(userId: number) {
  const perm = permissoesDoUsuarioId(userId);
  return temPermissao(perm, "usuarios", "criar");
}

export function assertPeriodoProdutividade(filtros: RelatorioFiltros) {
  if (!filtros.de?.trim() || !filtros.ate?.trim()) {
    throw new RelatorioServiceError("Informe o período (data inicial e final) para consultar a produtividade.", 400);
  }
  if (filtros.de > filtros.ate) {
    throw new RelatorioServiceError("A data inicial não pode ser posterior à data final.", 400);
  }
}

function linhaFromContagens(codigoRe: string, contagens: Record<IndicadorProdutividadeId, number>, porMeio: Record<string, number>) {
  return {
    codigoRe,
    atendimentosRegistrados: contagens.atendimentos_registrados,
    retornosPrevistos: contagens.retornos_previstos,
    retornosConcluidos: contagens.retornos_concluidos,
    retornosAtrasados: contagens.retornos_atrasados,
    retornosEmAberto: contagens.retornos_em_aberto,
    negociacoesRegistradas: contagens.negociacoes_criadas,
    acoesRegistradas: contagens.acoes_agendadas,
    cobrancasAtribuidas: contagens.cobrancas_carteira,
    acordosConfirmados: contagens.acordos_confirmados,
    porMeio,
  };
}

export function montarPainelProdutividadePorRe(userId: number, filtros: RelatorioFiltros): PainelProdutividadePorRe {
  if (!podeAcessarPainelProdutividadeGlobal(userId)) {
    throw new RelatorioServiceError("Sem permissão para consultar o painel de produtividade da equipe.", 403);
  }
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "relatorios", "ler")) {
    throw new RelatorioServiceError("Sem permissão para consultar relatórios.", 403);
  }

  assertPeriodoProdutividade(filtros);

  const de = filtros.de.trim();
  const ate = filtros.ate.trim();
  const hoje = hojeIso();

  const atendentes = listarAtendentesComRe();
  let resRe = atendentes.map((item) => item.codigoRe);
  if (filtros.codigoRe !== "todos" && filtros.codigoRe.trim()) {
    const alvo = filtros.codigoRe.trim().toUpperCase();
    resRe = resRe.filter((re) => re.toUpperCase() === alvo);
    if (resRe.length === 0 && usuarioIdsPorRe(alvo).length > 0) {
      resRe = [filtros.codigoRe.trim()];
    }
  }

  const linhas: ProdutividadePorReLinha[] = resRe.map((codigoRe) => {
    const filtrosRe = { ...filtros, codigoRe };
    const contagens = Object.fromEntries(
      INDICADORES_PAINEL.map((id) => [id, contarEventos(userId, filtrosRe, id)]),
    ) as Record<IndicadorProdutividadeId, number>;

    const porMeio: Record<string, number> = {};
    for (const ev of listarEventosProdutividade(userId, filtrosRe, "atendimentos_registrados")) {
      const meio = ev.meio?.trim() || "—";
      porMeio[meio] = (porMeio[meio] ?? 0) + 1;
    }

    return linhaFromContagens(codigoRe, contagens, porMeio);
  });

  linhas.sort((a, b) => a.codigoRe.localeCompare(b.codigoRe, "pt-BR"));

  const porMeioTotais: Record<string, number> = {};
  const totais = linhas.reduce(
    (acc, linha) => {
      acc.atendimentosRegistrados += linha.atendimentosRegistrados;
      acc.retornosPrevistos += linha.retornosPrevistos;
      acc.retornosConcluidos += linha.retornosConcluidos;
      acc.retornosAtrasados += linha.retornosAtrasados;
      acc.retornosEmAberto += linha.retornosEmAberto;
      acc.negociacoesRegistradas += linha.negociacoesRegistradas;
      acc.acoesRegistradas += linha.acoesRegistradas;
      acc.cobrancasAtribuidas += linha.cobrancasAtribuidas;
      acc.acordosConfirmados += linha.acordosConfirmados;
      for (const [meio, qtd] of Object.entries(linha.porMeio)) {
        porMeioTotais[meio] = (porMeioTotais[meio] ?? 0) + qtd;
      }
      return acc;
    },
    {
      atendimentosRegistrados: 0,
      retornosPrevistos: 0,
      retornosConcluidos: 0,
      retornosAtrasados: 0,
      retornosEmAberto: 0,
      negociacoesRegistradas: 0,
      acoesRegistradas: 0,
      cobrancasAtribuidas: 0,
      acordosConfirmados: 0,
    },
  );

  return {
    periodo: {
      de,
      ate,
      rotulo: `${formatarData(de)} a ${formatarData(ate)} (consulta em ${formatarData(hoje)})`,
    },
    definicoes: DEFINICOES_INDICADORES_PRODUTIVIDADE,
    meta: {
      geradoEm: geradoEmBr(),
      filtros: rotulosFiltrosAplicados(filtros, "produtividade"),
    },
    linhas,
    totais: { ...totais, porMeio: porMeioTotais },
  };
}
