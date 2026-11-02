import {
  CATALOGO_INDICADORES_OFICIAIS,
  definicaoIndicador,
  type IndicadorProdutividadeId,
} from "@/lib/indicadores/catalogo-oficial";
import { geradoEmBr } from "@/lib/indicadores/meta";
import { contagemPorRe, listarEventosProdutividade } from "@/lib/indicadores/produtividade-eventos";
import { montarPainelProdutividadePorRe, type ProdutividadePorReLinha } from "@/lib/relatorios/produtividade";
import {
  RelatorioServiceError,
  assertCondominioNoEscopo,
  rotulosFiltrosAplicados,
  type RelatorioFiltros,
} from "@/lib/relatorios/service";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";
import { assertPeriodoProdutividade, podeAcessarPainelProdutividadeGlobal } from "@/lib/relatorios/produtividade";

export class ConferenciaIndicadoresError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type ConsultaReferenciaIndicador = {
  indicador: IndicadorProdutividadeId;
  definicao: (typeof CATALOGO_INDICADORES_OFICIAIS)[number];
  total: number;
  porRe: { codigoRe: string; quantidade: number }[];
  linhas: ReturnType<typeof listarEventosProdutividade>;
  meta: { geradoEm: string; filtros: string[] };
  conciliacaoPainel: { valorPainel: number | null; coincide: boolean | null };
};

function valorPainelParaIndicador(linha: ProdutividadePorReLinha | undefined, indicador: IndicadorProdutividadeId): number {
  if (!linha) return 0;
  switch (indicador) {
    case "atendimentos_registrados":
      return linha.atendimentosRegistrados;
    case "retornos_concluidos":
      return linha.retornosConcluidos;
    case "retornos_previstos":
      return linha.retornosPrevistos;
    case "retornos_atrasados":
      return linha.retornosAtrasados;
    case "retornos_em_aberto":
      return linha.retornosEmAberto;
    case "negociacoes_criadas":
      return linha.negociacoesRegistradas;
    case "acoes_agendadas":
      return linha.acoesRegistradas;
    case "acordos_confirmados":
      return linha.acordosConfirmados;
    case "cobrancas_carteira":
      return linha.cobrancasAtribuidas;
    default:
      return 0;
  }
}

function totalPainelIndicador(painel: ReturnType<typeof montarPainelProdutividadePorRe>, indicador: IndicadorProdutividadeId) {
  const linha = painel.totais;
  const fake: ProdutividadePorReLinha = {
    codigoRe: "—",
    atendimentosRegistrados: linha.atendimentosRegistrados,
    retornosPrevistos: linha.retornosPrevistos,
    retornosConcluidos: linha.retornosConcluidos,
    retornosAtrasados: linha.retornosAtrasados,
    retornosEmAberto: linha.retornosEmAberto,
    negociacoesRegistradas: linha.negociacoesRegistradas,
    acoesRegistradas: linha.acoesRegistradas,
    cobrancasAtribuidas: linha.cobrancasAtribuidas,
    acordosConfirmados: linha.acordosConfirmados,
    porMeio: linha.porMeio,
  };
  return valorPainelParaIndicador(fake, indicador);
}

export function obterCatalogoIndicadoresOficiais() {
  return CATALOGO_INDICADORES_OFICIAIS;
}

export function consultarReferenciaIndicador(
  userId: number,
  indicador: IndicadorProdutividadeId,
  filtros: RelatorioFiltros,
): ConsultaReferenciaIndicador {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "relatorios", "ler")) {
    throw new ConferenciaIndicadoresError("Sem permissão para consultar indicadores.", 403);
  }
  if (!podeAcessarPainelProdutividadeGlobal(userId)) {
    throw new ConferenciaIndicadoresError("Consulta de referência disponível apenas para a administradora.", 403);
  }

  if (indicador !== "cobrancas_carteira") {
    assertPeriodoProdutividade(filtros);
  }

  const definicao = definicaoIndicador(indicador);
  if (!definicao) {
    throw new ConferenciaIndicadoresError("Indicador não catalogado.", 400);
  }

  assertCondominioNoEscopo(userId, filtros.condominioId);

  const linhas = listarEventosProdutividade(userId, filtros, indicador);
  const mapa = contagemPorRe(linhas);
  const porRe = [...mapa.entries()]
    .map(([codigoRe, quantidade]) => ({ codigoRe, quantidade }))
    .sort((a, b) => a.codigoRe.localeCompare(b.codigoRe, "pt-BR"));

  let valorPainel: number | null = null;
  let coincide: boolean | null = null;
  try {
    const painel = montarPainelProdutividadePorRe(userId, filtros);
    valorPainel = totalPainelIndicador(painel, indicador);
    coincide = valorPainel === linhas.length;
  } catch (error) {
    if (error instanceof RelatorioServiceError) throw new ConferenciaIndicadoresError(error.message, error.status);
    throw error;
  }

  return {
    indicador,
    definicao,
    total: linhas.length,
    porRe,
    linhas,
    meta: {
      geradoEm: geradoEmBr(),
      filtros: rotulosFiltrosAplicados(filtros, "produtividade"),
    },
    conciliacaoPainel: { valorPainel, coincide },
  };
}
