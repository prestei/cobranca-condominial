import { debitoAbertoNaData, debitoPrescrito, type Cadastros, type Debito } from "@/data/catalogo";
import { chaveUnicaIndicador } from "@/lib/debitos/indicadores";
import { debitoInadimplenciaAtiva, idsDebitosEmNegociacaoAtiva } from "@/lib/debitos/operational-situation";
import {
  debitoEmNegociacaoPainel,
  unidadeEmNegociacaoOperacional,
} from "@/lib/debitos/unidade-em-negociacao";

export type SituacaoPainelId = "em_aberto" | "em_negociacao" | "quitadas" | "prescritas";

/** Recorte da listagem de inadimplência (abas acima da tabela). */
export type RecorteListagemInadimplenciaId = SituacaoPainelId | "historico";

/** Abas visíveis na listagem (sem Histórico). */
export const RECORTES_LISTAGEM_INADIMPLENCIA: RecorteListagemInadimplenciaId[] = [
  "em_aberto",
  "em_negociacao",
  "quitadas",
  "prescritas",
];

const MESES_EVOLUCAO = 5;

export type FatiaSituacaoPainel = {
  id: SituacaoPainelId;
  nome: string;
  quantidade: number;
  percentual: number | null;
};

export type PontoEvolucaoSituacaoPainel = {
  mes: string;
  mesRotulo: string;
  emAberto: number;
  quitadas: number;
  prescritas: number;
  emNegociacao: number;
};

export type ResumoPainelSituacao = {
  totalRegistros: number;
  fatias: FatiaSituacaoPainel[];
  evolucao: PontoEvolucaoSituacaoPainel[];
  kpis: Array<{
    id: SituacaoPainelId;
    valor: number;
    variacaoPercentual: number | null;
    serie: number[];
  }>;
};

export function ultimoDiaMes(anoMes: string) {
  const [ano, mes] = anoMes.split("-").map(Number);
  const ultimo = new Date(ano, mes, 0);
  return ultimo.toISOString().slice(0, 10);
}

export function mesesEvolucaoPainel(dataBase: string): string[] {
  const baseMes = dataBase.slice(0, 7);
  const [ano0, mes0] = baseMes.split("-").map(Number);
  const meses: string[] = [];
  for (let i = MESES_EVOLUCAO - 1; i >= 0; i--) {
    const d = new Date(ano0, mes0 - 1 - i, 1);
    const ano = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, "0");
    meses.push(`${ano}-${mes}`);
  }
  return meses;
}

export function rotuloMesCurtoPainel(anoMes: string) {
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const [ano, mes] = anoMes.split("-").map(Number);
  const rotulo = meses[mes - 1] ?? mes.toString().padStart(2, "0");
  return `${rotulo}/${String(ano).slice(2)}`;
}

export function emNegociacaoUnidade(unidadeId: number, cadastros: Cadastros): boolean {
  return unidadeEmNegociacaoOperacional(cadastros, unidadeId);
}

function debitoQuitadoNaData(item: Debito, dataBase: string) {
  return item.status === "Pago" && Boolean(item.dataPagamento) && item.dataPagamento <= dataBase;
}

export type ClassificacaoDebitoPainel = SituacaoPainelId | null;

/** Classifica um débito na data-base em uma fatia do painel (mutuamente exclusivo). */
export function classificarDebitoSituacaoPainel(
  item: Debito,
  dataBase: string,
  cadastros: Cadastros,
  debitoIdsEmNegociacaoAtiva?: Set<number>,
): ClassificacaoDebitoPainel {
  if (debitoQuitadoNaData(item, dataBase)) return "quitadas";
  if (!debitoAbertoNaData(item, dataBase)) return null;

  const emNegociacaoIds =
    debitoIdsEmNegociacaoAtiva ?? idsDebitosEmNegociacaoAtiva(cadastros.propostasNegociacao);
  // Acordo formalizado / fila de negociação prevalece sobre prescrição (T24/T25), como na fila e em operational-situation.
  if (
    debitoInadimplenciaAtiva(item) &&
    debitoEmNegociacaoPainel(item, cadastros, emNegociacaoIds)
  ) {
    return "em_negociacao";
  }
  if (debitoPrescrito(item)) return "prescritas";
  if (!debitoInadimplenciaAtiva(item)) return null;
  return "em_aberto";
}

function deduplicarDebitos(itens: Debito[]): Debito[] {
  const vistos = new Set<string>();
  const saida: Debito[] = [];
  for (const item of itens) {
    const chave = chaveUnicaIndicador(item);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(item);
  }
  return saida;
}

function contarPorSituacao(itens: Debito[], dataBase: string, cadastros: Cadastros): Record<SituacaoPainelId, number> {
  const contagem: Record<SituacaoPainelId, number> = {
    em_aberto: 0,
    em_negociacao: 0,
    quitadas: 0,
    prescritas: 0,
  };
  const emNegociacaoIds = idsDebitosEmNegociacaoAtiva(cadastros.propostasNegociacao);
  for (const item of itens) {
    const cat = classificarDebitoSituacaoPainel(item, dataBase, cadastros, emNegociacaoIds);
    if (cat) contagem[cat] += 1;
  }
  return contagem;
}

export function variacaoPercentual(atual: number, anterior: number): number | null {
  if (anterior <= 0) return atual > 0 ? 100 : null;
  return ((atual - anterior) / anterior) * 100;
}

const ROTULOS: Record<SituacaoPainelId, string> = {
  em_aberto: "Em aberto",
  em_negociacao: "Em negociação",
  quitadas: "Quitadas",
  prescritas: "Prescritas",
};

export const ROTULOS_RECORTE_LISTAGEM: Record<RecorteListagemInadimplenciaId, string> = {
  ...ROTULOS,
  historico: "Histórico",
};

/** Classifica o recorte da listagem; **Histórico** reúne registros fora das quatro situações operacionais. */
export function recorteListagemInadimplencia(
  item: Debito,
  dataBase: string,
  cadastros: Cadastros,
): RecorteListagemInadimplenciaId {
  const situacao = classificarDebitoSituacaoPainel(item, dataBase, cadastros);
  return situacao ?? "historico";
}

export function filtrarDebitosPorRecorteListagem(
  itens: Debito[],
  recorte: RecorteListagemInadimplenciaId,
  dataBase: string,
  cadastros: Cadastros,
): Debito[] {
  return itens.filter((item) => recorteListagemInadimplencia(item, dataBase, cadastros) === recorte);
}

export function montarResumoPainelSituacao(
  debitos: Debito[],
  dataBase: string,
  cadastros: Cadastros,
): ResumoPainelSituacao {
  const base = deduplicarDebitos(debitos);
  const contagemAtual = contarPorSituacao(base, dataBase, cadastros);
  const totalRegistros =
    contagemAtual.em_aberto +
    contagemAtual.em_negociacao +
    contagemAtual.quitadas +
    contagemAtual.prescritas;

  const fatias: FatiaSituacaoPainel[] = (Object.keys(ROTULOS) as SituacaoPainelId[]).map((id) => ({
    id,
    nome: ROTULOS[id],
    quantidade: contagemAtual[id],
    percentual: totalRegistros > 0 ? (contagemAtual[id] / totalRegistros) * 100 : null,
  }));

  const evolucao: PontoEvolucaoSituacaoPainel[] = mesesEvolucaoPainel(dataBase).map((mes) => {
    const fimMes = ultimoDiaMes(mes);
    const dataRef = fimMes > dataBase ? dataBase : fimMes;
    const contagem = contarPorSituacao(base, dataRef, cadastros);
    return {
      mes,
      mesRotulo: rotuloMesCurtoPainel(mes),
      emAberto: contagem.em_aberto,
      emNegociacao: contagem.em_negociacao,
      quitadas: contagem.quitadas,
      prescritas: contagem.prescritas,
    };
  });

  const kpis = (Object.keys(ROTULOS) as SituacaoPainelId[]).map((id) => {
    const serie =
      id === "em_aberto"
        ? evolucao.map((ponto) => ponto.emAberto)
        : id === "em_negociacao"
          ? evolucao.map((ponto) => ponto.emNegociacao)
          : id === "quitadas"
            ? evolucao.map((ponto) => ponto.quitadas)
            : evolucao.map((ponto) => ponto.prescritas);
    const atual = serie[serie.length - 1] ?? 0;
    const anterior = serie.length > 1 ? (serie[serie.length - 2] ?? 0) : 0;
    return {
      id,
      valor: contagemAtual[id],
      variacaoPercentual: variacaoPercentual(atual, anterior),
      serie,
    };
  });

  return { totalRegistros, fatias, evolucao, kpis };
}