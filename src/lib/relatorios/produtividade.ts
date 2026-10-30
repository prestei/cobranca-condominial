import {
  escopoCondominios,
  formatarData,
  getCadastros,
  hojeIso,
  situacaoRetorno,
  type Atendimento,
  type Condominio,
} from "@/data/catalogo";
import { codigoReDoUsuario, listarAtendentesComRe } from "@/lib/colaboradores/re";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";
import type { RelatorioFiltros } from "@/lib/relatorios/service";
import { RelatorioServiceError } from "@/lib/relatorios/service";

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
  "Negociações: propostas de negociação criadas no período pelo RE autor do registro.",
  "Ações agendadas: atendimentos registrados no período pelo RE em que foi definida data de retorno ou próxima ação.",
  "Acordos confirmados: propostas aceitas com confirmação no período, atribuídas ao RE que confirmou o acordo (quando informado).",
  "Retornos previstos: agendamentos com data prevista no período, atribuídos ao RE que registrou o atendimento (independente do responsável atual da carteira).",
  "Retornos atrasados: entre os retornos previstos no período, os que seguem em aberto com data prevista anterior a hoje (RE que agendou).",
  "Retornos em aberto: entre os retornos previstos no período, os que seguem em aberto com data prevista hoje ou futura (RE que agendou).",
  "Cobranças na carteira: unidades com atribuição vigente ao RE na data da consulta (snapshot atual).",
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
  linhas: ProdutividadePorReLinha[];
  totais: Omit<ProdutividadePorReLinha, "codigoRe" | "porMeio"> & { porMeio: Record<string, number> };
};

function dentro(data: string, inicio: string, fim: string) {
  const dia = data.slice(0, 10);
  if (!dia) return false;
  if (inicio && dia < inicio) return false;
  if (fim && dia > fim) return false;
  return true;
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

function condominioDaUnidade(unidadeId: string | number) {
  const unidade = getCadastros().unidades.find((item) => String(item.id) === String(unidadeId));
  if (!unidade) return undefined;
  return getCadastros().condominios.find((item) => item.id === unidade.condominioId);
}

function atendimentoNoEscopo(userId: number, item: Atendimento, filtros: RelatorioFiltros) {
  const idsCondominio = new Set(escopoCondominios(getCadastros(), userId).map((c) => c.id));
  const condominio = condominioDaUnidade(item.unidadeId);
  if (!condominio || !idsCondominio.has(condominio.id)) return false;
  return combinaCarteira(condominio, filtros);
}

function retornoEmAberto(item: Atendimento) {
  return Boolean(item.dataProximaAcao?.trim()) && !item.retornoConcluidoEm?.trim();
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
  const cadastros = getCadastros();

  const atendentes = listarAtendentesComRe();
  let resRe = atendentes.map((item) => item.codigoRe);
  if (filtros.codigoRe !== "todos" && filtros.codigoRe.trim()) {
    const alvo = filtros.codigoRe.trim().toUpperCase();
    resRe = resRe.filter((re) => re.toUpperCase() === alvo);
    if (resRe.length === 0 && usuarioIdsPorRe(alvo).length > 0) {
      resRe = [filtros.codigoRe.trim()];
    }
  }

  const atendimentosEscopo = cadastros.atendimentos.filter((item) => atendimentoNoEscopo(userId, item, filtros));

  const linhas: ProdutividadePorReLinha[] = resRe.map((codigoRe) => {
    const ids = new Set(usuarioIdsPorRe(codigoRe));
    const porMeio: Record<string, number> = {};

    let atendimentosRegistrados = 0;
    let retornosPrevistos = 0;
    let retornosConcluidos = 0;
    let retornosAtrasados = 0;
    let retornosEmAberto = 0;
    let acoesRegistradas = 0;

    for (const item of atendimentosEscopo) {
      if (dentro(item.dataHora, de, ate) && ids.has(item.usuarioId)) {
        atendimentosRegistrados += 1;
        const meio = item.canal?.trim() || "—";
        porMeio[meio] = (porMeio[meio] ?? 0) + 1;
        if (item.dataProximaAcao?.trim() || item.proximaAcao?.trim()) {
          acoesRegistradas += 1;
        }
      }

      if (item.dataProximaAcao?.trim() && ids.has(item.usuarioId) && dentro(item.dataProximaAcao, de, ate)) {
        retornosPrevistos += 1;
      }

      if (item.retornoConcluidoEm?.trim() && item.retornoConcluidoPorId != null && ids.has(item.retornoConcluidoPorId)) {
        if (dentro(item.retornoConcluidoEm, de, ate)) {
          retornosConcluidos += 1;
        }
      }

      if (
        retornoEmAberto(item) &&
        ids.has(item.usuarioId) &&
        dentro(item.dataProximaAcao, de, ate)
      ) {
        const situacao = situacaoRetorno(item.dataProximaAcao);
        if (situacao === "atrasado") {
          retornosAtrasados += 1;
        } else {
          retornosEmAberto += 1;
        }
      }
    }

    const idsUsuario = [...ids][0];
    let cobrancasAtribuidas = 0;
    if (idsUsuario != null) {
      for (const atrib of cadastros.atribuicoesCobranca) {
        if (atrib.encerradoEm || !ids.has(atrib.atendenteId)) continue;
        const unidade = cadastros.unidades.find((u) => u.id === atrib.unidadeId);
        const condominio = unidade ? cadastros.condominios.find((c) => c.id === unidade.condominioId) : undefined;
        if (!combinaCarteira(condominio, filtros)) continue;
        cobrancasAtribuidas += 1;
      }
    }

    let negociacoesRegistradas = 0;
    let acordosConfirmados = 0;
    for (const proposta of cadastros.propostasNegociacao) {
      const condominio = cadastros.condominios.find((c) => c.id === proposta.condominioId);
      if (!combinaCarteira(condominio, filtros)) continue;

      if (ids.has(proposta.usuarioId) && proposta.criadoEm?.trim() && dentro(proposta.criadoEm, de, ate)) {
        negociacoesRegistradas += 1;
      }

      if (proposta.status !== "Aceita" || !proposta.acordoConfirmadoEm?.trim()) continue;
      const autorId = proposta.acordoConfirmadoPorId ?? proposta.usuarioId;
      if (!ids.has(autorId)) continue;
      if (!dentro(proposta.acordoConfirmadoEm, de, ate)) continue;
      acordosConfirmados += 1;
    }

    return {
      codigoRe,
      atendimentosRegistrados,
      retornosPrevistos,
      retornosConcluidos,
      retornosAtrasados,
      retornosEmAberto,
      negociacoesRegistradas,
      acoesRegistradas,
      cobrancasAtribuidas,
      acordosConfirmados,
      porMeio,
    };
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
    linhas,
    totais: { ...totais, porMeio: porMeioTotais },
  };
}
