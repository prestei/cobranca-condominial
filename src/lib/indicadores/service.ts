import {
  debitoAbertoNaData,
  escopoUnidades,
  getCadastros,
  grupoDebito,
  gruposDebito,
  hojeIso,
  LIMITE_AMIGAVEL_DIAS,
  situacaoCobrancaUnidade,
  unidadeNaFilaCobrancaAtiva,
  type Debito,
} from "@/data/catalogo";
import { listarAtendimentos } from "@/lib/atendimentos/service";
import { somarValorAtualizadoSemDuplicata } from "@/lib/debitos/indicadores";
import { listarDebitos, obterIndicadoresDebitos } from "@/lib/debitos/service";
import { listarEncaminhamentosJuridicos } from "@/lib/juridico/service";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";
import { listarRetornosAgenda } from "@/lib/retornos/service";

export class IndicadoresServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type IndicadoresKpiId = "cobrancas" | "inadimplencia" | "retornos" | "produtividade";

export type IndicadoresKpi = {
  id: IndicadoresKpiId;
  rotulo: string;
  valorFormatado: string;
  variacao: { percentual: number | null };
};

export type IndicadoresSerieDia = {
  dia: string;
  valor: number;
  rotulo: string;
};

export type IndicadoresDistribuicao = {
  nome: string;
  valor: number;
  detalhe: string;
  percentual?: number | null;
};

export type IndicadoresRankingCondominio = {
  condominioId: number;
  nome: string;
  valorFormatado: string;
  fase: string;
  cobrancasAtivas: number;
  prioridade: string;
};

export type IndicadoresPainel = {
  dataBase: string;
  periodo: { inicio: string; fim: string };
  kpis: IndicadoresKpi[];
  porGrupo: IndicadoresDistribuicao[];
  porMeio: IndicadoresDistribuicao[];
  eficienciaSemanal: IndicadoresSerieDia[];
  produtividadeDiaria: IndicadoresSerieDia[];
  mediaMovelProdutividade: number | null;
  rankingCondominios: IndicadoresRankingCondominio[];
};

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function variacaoPercentual(atual: number, anterior: number): number | null {
  if (!Number.isFinite(atual) || !Number.isFinite(anterior)) return null;
  if (anterior === 0) return atual === 0 ? null : null;
  return ((atual - anterior) / anterior) * 100;
}

function deslocarDias(iso: string, delta: number) {
  const data = new Date(`${iso.slice(0, 10)}T12:00:00`);
  data.setDate(data.getDate() + delta);
  return data.toISOString().slice(0, 10);
}

function periodoUltimosDias(ate: string, quantidade: number) {
  const fim = ate;
  const inicio = deslocarDias(fim, -(quantidade - 1));
  return { inicio, fim };
}

function periodoAnterior(inicio: string, fim: string) {
  const dias = Math.round((Date.parse(`${fim}T12:00:00`) - Date.parse(`${inicio}T12:00:00`)) / 86400000) + 1;
  const fimAnterior = deslocarDias(inicio, -1);
  const inicioAnterior = deslocarDias(fimAnterior, -(dias - 1));
  return { inicio: inicioAnterior, fim: fimAnterior };
}

function dentro(dia: string, inicio: string, fim: string) {
  return dia >= inicio && dia <= fim;
}

function diasNoPeriodo(inicio: string, fim: string): string[] {
  const dias: string[] = [];
  let cursor = inicio;
  while (cursor <= fim) {
    dias.push(cursor);
    cursor = deslocarDias(cursor, 1);
  }
  return dias;
}

function atendimentosNoPeriodo(userId: number, inicio: string, fim: string) {
  return listarAtendimentos(userId).filter((item) => dentro(item.dataHora.slice(0, 10), inicio, fim));
}

function retornosPendentesNoPeriodo(userId: number, inicio: string, fim: string) {
  const { itens } = listarRetornosAgenda(userId, { estado: "pendente", de: inicio, ate: fim }, { page: 1, pageSize: 5000 });
  return itens.filter((item) => dentro(item.dataPrevista.slice(0, 10), inicio, fim));
}

function somarPagamentosNoPeriodo(userId: number, inicio: string, fim: string) {
  const idsUnidade = new Set(escopoUnidades(getCadastros(), userId).map((item) => item.id));
  let total = 0;

  for (const debito of listarDebitos(userId)) {
    const dia = debito.dataPagamento?.trim().slice(0, 10);
    if (!dia || !dentro(dia, inicio, fim)) continue;
    total += Number(debito.valorPago) || Number(debito.valorAtualizado) || 0;
  }

  for (const pagamento of getCadastros().pagamentosAcordo) {
    const dia = pagamento.dataPagamento.slice(0, 10);
    if (!dentro(dia, inicio, fim)) continue;
    if (!idsUnidade.has(pagamento.unidadeId)) continue;
    total += Number(pagamento.valor) || 0;
  }

  return total;
}

function totalInadimplenciaNaData(userId: number, dataBase: string, limiteDias: number) {
  const unidadesCarteira = escopoUnidades(getCadastros(), userId).length;
  const indicadores = obterIndicadoresDebitos(userId, {
    dataBase,
    limiteDias,
    unidadesCarteira,
    filtros: {},
  });
  return indicadores.totalAtualizado;
}

function distribuicaoGrupos(debitos: Debito[], totalAberto: number): IndicadoresDistribuicao[] {
  return gruposDebito
    .map((grupo) => {
      const itens = debitos.filter((item) => grupoDebito(item.descricao) === grupo);
      const valor = somarValorAtualizadoSemDuplicata(itens);
      return {
        nome: grupo,
        valor,
        detalhe: dinheiro(valor),
        percentual: totalAberto > 0 ? (valor / totalAberto) * 100 : null,
      };
    })
    .filter((item) => item.valor > 0)
    .sort((a, b) => b.valor - a.valor);
}

function distribuicaoMeio(atendimentos: ReturnType<typeof atendimentosNoPeriodo>): IndicadoresDistribuicao[] {
  const mapa = new Map<string, number>();
  for (const item of atendimentos) {
    const meio = item.canal.trim() || "Não informado";
    mapa.set(meio, (mapa.get(meio) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .map(([nome, valor]) => ({ nome, valor, detalhe: `${valor} atendimento${valor === 1 ? "" : "s"}` }))
    .sort((a, b) => b.valor - a.valor);
}

function eficienciaPorDia(userId: number, inicio: string, fim: string): IndicadoresSerieDia[] {
  return diasNoPeriodo(inicio, fim).map((dia) => {
    const doDia = atendimentosNoPeriodo(userId, dia, dia);
    const responderam = doDia.filter((item) => item.respondeu === "Sim").length;
    const valor = doDia.length ? (responderam / doDia.length) * 100 : 0;
    return {
      dia,
      valor,
      rotulo: doDia.length ? `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%` : "—",
    };
  });
}

function produtividadePorDia(userId: number, inicio: string, fim: string): IndicadoresSerieDia[] {
  return diasNoPeriodo(inicio, fim).map((dia) => {
    const quantidade = atendimentosNoPeriodo(userId, dia, dia).length;
    return {
      dia,
      valor: quantidade,
      rotulo: String(quantidade),
    };
  });
}

function prioridadeHeuristica(valor: number, cobrancasAtivas: number): string {
  if (valor >= 50_000 || cobrancasAtivas >= 15) return "Alta";
  if (valor >= 15_000 || cobrancasAtivas >= 5) return "Média";
  return "Baixa";
}

function faseOperacionalCondominio(userId: number, condominioId: number): string {
  const perm = permissoesDoUsuarioId(userId);
  const unidades = escopoUnidades(getCadastros(), userId).filter((item) => item.condominioId === condominioId);

  if (temPermissao(perm, "juridico", "ler")) {
    const abertos = listarEncaminhamentosJuridicos(userId).filter(
      (item) =>
        item.condominioId === condominioId &&
        item.status !== "Arquivado" &&
        item.status !== "Retornado à cobrança amigável",
    );
    if (abertos.length > 0) return "Em disputa";
  }

  if (unidades.some((item) => situacaoCobrancaUnidade(item) === "Em acordo")) return "Em acordo";
  return "Em cobrança";
}

function cobrancasAtivasCondominio(userId: number, condominioId: number) {
  return escopoUnidades(getCadastros(), userId).filter(
    (item) => item.condominioId === condominioId && unidadeNaFilaCobrancaAtiva(item),
  ).length;
}

function montarRanking(userId: number, dataBase: string, limiteDias: number): IndicadoresRankingCondominio[] {
  const cadastros = getCadastros();
  const debitos = listarDebitos(userId).filter((item) => debitoAbertoNaData(item, dataBase));
  const idsCondominio = new Set(debitos.map((item) => item.condominioId));

  return [...idsCondominio]
    .map((condominioId) => {
      const itens = debitos.filter((item) => item.condominioId === condominioId);
      const valor = somarValorAtualizadoSemDuplicata(itens);
      const cobrancasAtivas = cobrancasAtivasCondominio(userId, condominioId);
      return {
        condominioId,
        nome: cadastros.condominios.find((item) => item.id === condominioId)?.nome ?? "—",
        valor,
        valorFormatado: dinheiro(valor),
        fase: faseOperacionalCondominio(userId, condominioId),
        cobrancasAtivas,
        prioridade: prioridadeHeuristica(valor, cobrancasAtivas),
      };
    })
    .sort((a, b) => b.valor - a.valor)
    .map(({ valor: _valor, ...linha }) => linha);
}

export function diaCurto(iso: string): string {
  const dia = iso.slice(0, 10);
  if (dia.length < 10) return iso;
  const [, mes, dd] = dia.split("-");
  return `${dd}/${mes}`;
}

export function obterPainelIndicadores(
  userId: number,
  input?: { dataBase?: string; limiteDias?: number },
): IndicadoresPainel {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "relatorios", "ler")) {
    throw new IndicadoresServiceError("Sem permissão para consultar indicadores.", 403);
  }
  if (!temPermissao(perm, "debitos", "ler")) {
    throw new IndicadoresServiceError("Sem permissão para consultar inadimplência nos indicadores.", 403);
  }

  const dataBase = input?.dataBase?.trim() || hojeIso();
  const limiteDias =
    input?.limiteDias != null && Number.isFinite(input.limiteDias) && input.limiteDias >= 1
      ? input.limiteDias
      : LIMITE_AMIGAVEL_DIAS;

  const hoje = hojeIso();
  const periodo = periodoUltimosDias(hoje, 7);
  const periodoAnt = periodoAnterior(periodo.inicio, periodo.fim);

  const atendimentosAtual = atendimentosNoPeriodo(userId, periodo.inicio, periodo.fim);
  const atendimentosAnterior = atendimentosNoPeriodo(userId, periodoAnt.inicio, periodoAnt.fim);

  const retornosAtual = retornosPendentesNoPeriodo(userId, periodo.inicio, periodo.fim).length;
  const retornosAnterior = retornosPendentesNoPeriodo(userId, periodoAnt.inicio, periodoAnt.fim).length;

  const inadimplenciaAtual = totalInadimplenciaNaData(userId, dataBase, limiteDias);
  const inadimplenciaAnterior = totalInadimplenciaNaData(userId, deslocarDias(dataBase, -7), limiteDias);

  const pagamentosAtual = somarPagamentosNoPeriodo(userId, periodo.inicio, periodo.fim);
  const pagamentosAnterior = somarPagamentosNoPeriodo(userId, periodoAnt.inicio, periodoAnt.fim);

  const kpis: IndicadoresKpi[] = [
    {
      id: "cobrancas",
      rotulo: "Cobranças (7 dias)",
      valorFormatado: String(atendimentosAtual.length),
      variacao: { percentual: variacaoPercentual(atendimentosAtual.length, atendimentosAnterior.length) },
    },
    {
      id: "inadimplencia",
      rotulo: "Inadimplência total",
      valorFormatado: dinheiro(inadimplenciaAtual),
      variacao: { percentual: variacaoPercentual(inadimplenciaAtual, inadimplenciaAnterior) },
    },
    {
      id: "retornos",
      rotulo: "Retornos na semana",
      valorFormatado: String(retornosAtual),
      variacao: { percentual: variacaoPercentual(retornosAtual, retornosAnterior) },
    },
    {
      id: "produtividade",
      rotulo: "Produtividade recente",
      valorFormatado: dinheiro(pagamentosAtual),
      variacao: { percentual: variacaoPercentual(pagamentosAtual, pagamentosAnterior) },
    },
  ];

  const debitosAbertos = listarDebitos(userId).filter((item) => debitoAbertoNaData(item, dataBase));
  const totalAberto = inadimplenciaAtual;

  const produtividadeDiaria = produtividadePorDia(userId, periodo.inicio, periodo.fim);
  const somaAtendimentos = produtividadeDiaria.reduce((acc, item) => acc + item.valor, 0);
  const mediaMovelProdutividade = produtividadeDiaria.length ? somaAtendimentos / produtividadeDiaria.length : null;

  return {
    dataBase,
    periodo,
    kpis,
    porGrupo: distribuicaoGrupos(debitosAbertos, totalAberto),
    porMeio: distribuicaoMeio(atendimentosAtual),
    eficienciaSemanal: eficienciaPorDia(userId, periodo.inicio, periodo.fim),
    produtividadeDiaria,
    mediaMovelProdutividade,
    rankingCondominios: montarRanking(userId, dataBase, limiteDias),
  };
}
