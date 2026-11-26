import {
  debitoAbertoOperacionalNaData,
  situacaoCobrancaUnidade,
  type Cadastros,
  type Debito,
  type Unidade,
} from "@/data/catalogo";
import {
  emNegociacaoUnidade,
  mesesEvolucaoPainel,
  rotuloMesCurtoPainel,
  ultimoDiaMes,
  variacaoPercentual,
} from "@/lib/debitos/painel-situacao";

export type UnidadePainelId = "em_aberto" | "em_negociacao" | "em_dia" | "quitada";

export type FatiaUnidadePainel = {
  id: UnidadePainelId;
  nome: string;
  quantidade: number;
  percentual: number | null;
};

export type PontoEvolucaoUnidadePainel = {
  mes: string;
  mesRotulo: string;
  emAberto: number;
  emNegociacao: number;
  emDia: number;
  quitada: number;
};

export type ResumoPainelUnidade = {
  totalUnidades: number;
  fatias: FatiaUnidadePainel[];
  evolucao: PontoEvolucaoUnidadePainel[];
  kpis: Array<{
    id: UnidadePainelId;
    valor: number;
    variacaoPercentual: number | null;
    serie: number[];
  }>;
};

const ROTULOS: Record<UnidadePainelId, string> = {
  em_aberto: "Com débito vencido",
  em_negociacao: "Em negociação",
  em_dia: "Sem débito vencido",
  quitada: "Quitada",
};

/** Classifica a unidade na data-base (mutuamente exclusivo; alinhado ao % de unidades devedoras). */
export function classificarUnidadePainel(
  unidade: Unidade,
  debitosUnidade: Debito[],
  dataBase: string,
  cadastros: Cadastros,
): UnidadePainelId {
  if (situacaoCobrancaUnidade(unidade) === "Quitada") return "quitada";
  const temOperacional = debitosUnidade.some((item) => debitoAbertoOperacionalNaData(item, dataBase));
  if (temOperacional) {
    return emNegociacaoUnidade(unidade.id, cadastros) ? "em_negociacao" : "em_aberto";
  }
  return "em_dia";
}

function contarPorSituacaoUnidade(
  unidades: Unidade[],
  debitos: Debito[],
  dataBase: string,
  cadastros: Cadastros,
): Record<UnidadePainelId, number> {
  const contagem: Record<UnidadePainelId, number> = {
    em_aberto: 0,
    em_negociacao: 0,
    em_dia: 0,
    quitada: 0,
  };
  for (const unidade of unidades) {
    const debitosUnidade = debitos.filter((item) => item.unidadeId === unidade.id);
    const cat = classificarUnidadePainel(unidade, debitosUnidade, dataBase, cadastros);
    contagem[cat] += 1;
  }
  return contagem;
}

export function montarResumoPainelUnidade(
  unidades: Unidade[],
  debitos: Debito[],
  dataBase: string,
  cadastros: Cadastros,
): ResumoPainelUnidade {
  const contagemAtual = contarPorSituacaoUnidade(unidades, debitos, dataBase, cadastros);
  const totalUnidades = unidades.length;

  const fatias: FatiaUnidadePainel[] = (Object.keys(ROTULOS) as UnidadePainelId[]).map((id) => ({
    id,
    nome: ROTULOS[id],
    quantidade: contagemAtual[id],
    percentual: totalUnidades > 0 ? (contagemAtual[id] / totalUnidades) * 100 : null,
  }));

  const evolucao: PontoEvolucaoUnidadePainel[] = mesesEvolucaoPainel(dataBase).map((mes) => {
    const fimMes = ultimoDiaMes(mes);
    const dataRef = fimMes > dataBase ? dataBase : fimMes;
    const contagem = contarPorSituacaoUnidade(unidades, debitos, dataRef, cadastros);
    return {
      mes,
      mesRotulo: rotuloMesCurtoPainel(mes),
      emAberto: contagem.em_aberto,
      emNegociacao: contagem.em_negociacao,
      emDia: contagem.em_dia,
      quitada: contagem.quitada,
    };
  });

  const kpis = (Object.keys(ROTULOS) as UnidadePainelId[]).map((id) => {
    const serie =
      id === "em_aberto"
        ? evolucao.map((ponto) => ponto.emAberto)
        : id === "em_negociacao"
          ? evolucao.map((ponto) => ponto.emNegociacao)
          : id === "em_dia"
            ? evolucao.map((ponto) => ponto.emDia)
            : evolucao.map((ponto) => ponto.quitada);
    const atual = serie[serie.length - 1] ?? 0;
    const anterior = serie.length > 1 ? (serie[serie.length - 2] ?? 0) : 0;
    return {
      id,
      valor: contagemAtual[id],
      variacaoPercentual: variacaoPercentual(atual, anterior),
      serie,
    };
  });

  return { totalUnidades, fatias, evolucao, kpis };
}