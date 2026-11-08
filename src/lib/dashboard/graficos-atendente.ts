import {
  debitoAbertoNaData,
  diasDeAtraso,
  escopoUnidades,
  getCadastros,
  hojeIso,
  situacaoCobrancaUnidade,
  type Atendimento,
  type Debito,
  type Unidade,
} from "@/data/catalogo";
import {
  aguardandoRetornoTerceiro,
  atendimentoPendenteAcao,
} from "@/lib/dashboard/indicadores-operacionais-atendente";
import {
  calcularIndicadoresInadimplencia,
  somarValorAtualizadoSemDuplicata,
  somarValorOriginalSemDuplicata,
} from "@/lib/debitos/indicadores";
import { listarDebitos } from "@/lib/debitos/service";
import { listarFilaCobranca } from "@/lib/fila/service";
import { listarEncaminhamentosJuridicos } from "@/lib/juridico/service";
import { propostaContaComoNegociacaoCriada } from "@/lib/indicadores/regras-evento";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

/** Faixas do dashboard do atendente (T32) — subset operacional documentado em docs/modulos/dashboard.md */
export const FAIXAS_ATRASO_DASHBOARD_ATENDENTE = [
  { id: "ate_30", label: "Até 30 dias", min: 0, max: 30 },
  { id: "de_31_60", label: "De 31 a 60 dias", min: 31, max: 60 },
  { id: "de_61_90", label: "De 61 a 90 dias", min: 61, max: 90 },
  { id: "acima_90", label: "Acima de 90 dias", min: 91, max: Number.POSITIVE_INFINITY },
] as const;

export type FaixaAtrasoDashboardId = (typeof FAIXAS_ATRASO_DASHBOARD_ATENDENTE)[number]["id"];

export type GraficoDistribuicaoValor = {
  id: string;
  nome: string;
  valor: number;
  quantidade: number;
  percentual: number | null;
};

export type GraficoCondominioLinha = {
  condominioId: number;
  nome: string;
  unidadesInadimplentes: number;
  valorOriginal: number;
  valorAtualizado: number;
};

export type GraficoEvolucaoMes = {
  mes: string;
  mesRotulo: string;
  dataBaseMes: string;
  saldoAberto: number;
  recuperacaoFinanceira: number;
  variacaoSaldo: number | null;
};

export type DashboardGraficosAtendente = {
  faixasAtraso: GraficoDistribuicaoValor[];
  porSituacao: GraficoDistribuicaoValor[];
  porCondominio: GraficoCondominioLinha[];
  evolucaoMensal: GraficoEvolucaoMes[];
  totais: {
    debitosConsiderados: number;
    unidadesNaFila: number;
  };
  regras: {
    faixasAtraso: string;
    situacaoCarteira: string;
    evolucao: string;
  };
};

export type SituacaoCarteiraId =
  | "aguardando_atendimento"
  | "em_negociacao"
  | "aguardando_retorno"
  | "em_acompanhamento"
  | "encaminhado_juridico"
  | "concluido";

const ROTULOS_SITUACAO: Record<SituacaoCarteiraId, string> = {
  aguardando_atendimento: "Aguardando atendimento",
  em_negociacao: "Em negociação",
  aguardando_retorno: "Aguardando retorno",
  em_acompanhamento: "Em acompanhamento",
  encaminhado_juridico: "Encaminhado ao jurídico",
  concluido: "Concluído",
};

const MESES_EVOLUCAO = 12;

function deslocarDias(iso: string, delta: number) {
  const base = new Date(`${iso.slice(0, 10)}T12:00:00`);
  base.setDate(base.getDate() + delta);
  return base.toISOString().slice(0, 10);
}

function ultimoDiaMes(anoMes: string) {
  const [ano, mes] = anoMes.split("-").map(Number);
  const ultimo = new Date(ano, mes, 0);
  return ultimo.toISOString().slice(0, 10);
}

function primeiroDiaMes(anoMes: string) {
  return `${anoMes.slice(0, 7)}-01`;
}

function mesesEvolucaoAteDataBase(dataBase: string): string[] {
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

function rotuloMes(anoMes: string) {
  const [ano, mes] = anoMes.split("-");
  return `${mes}/${ano.slice(2)}`;
}

function unidadeIdsCarteiraVigente(userId: number): Set<number> {
  const ids = new Set<number>();
  for (const item of getCadastros().atribuicoesCobranca) {
    if (!item.encerradoEm && item.atendenteId === userId) ids.add(item.unidadeId);
  }
  return ids;
}

export function debitosCarteiraVigente(userId: number): Debito[] {
  const ids = unidadeIdsCarteiraVigente(userId);
  return listarDebitos(userId).filter((item) => ids.has(item.unidadeId));
}

function debitosAbertosCarteira(userId: number, dataBase: string): Debito[] {
  return debitosCarteiraVigente(userId).filter((item) => debitoAbertoNaData(item, dataBase));
}

function dentro(dia: string, inicio: string, fim: string) {
  return dia >= inicio && dia <= fim;
}

function somarRecuperacaoFinanceiraNoPeriodo(userId: number, inicio: string, fim: string) {
  const ids = unidadeIdsCarteiraVigente(userId);
  let total = 0;
  for (const debito of debitosCarteiraVigente(userId)) {
    const dia = debito.dataPagamento?.trim().slice(0, 10);
    if (!dia || !dentro(dia, inicio, fim)) continue;
    total += Number(debito.valorPago) || Number(debito.valorAtualizado) || 0;
  }
  for (const pagamento of getCadastros().pagamentosAcordo) {
    const dia = pagamento.dataPagamento.slice(0, 10);
    if (!dia || !dentro(dia, inicio, fim)) continue;
    if (!ids.has(pagamento.unidadeId)) continue;
    total += Number(pagamento.valor) || 0;
  }
  return total;
}

function saldoAbertoNaDataFiltrado(
  userId: number,
  dataBase: string,
  limiteDias: number,
  unidadeIds: Set<number> | null | undefined,
) {
  const unidadesCarteira = unidadeIds ? unidadeIds.size : unidadeIdsCarteiraVigente(userId).size;
  let debitos = debitosCarteiraVigente(userId);
  if (unidadeIds) debitos = debitos.filter((item) => unidadeIds.has(item.unidadeId));
  return calcularIndicadoresInadimplencia({
    debitos,
    dataBase,
    limiteDias,
    unidadesCarteira,
  }).totalAtualizado;
}

function somarRecuperacaoFinanceiraNoPeriodoFiltrado(
  userId: number,
  inicio: string,
  fim: string,
  unidadeIds: Set<number> | null | undefined,
) {
  const ids = unidadeIds ?? unidadeIdsCarteiraVigente(userId);
  let total = 0;
  for (const debito of debitosCarteiraVigente(userId)) {
    if (!ids.has(debito.unidadeId)) continue;
    const dia = debito.dataPagamento?.trim().slice(0, 10);
    if (!dia || !dentro(dia, inicio, fim)) continue;
    total += Number(debito.valorPago) || Number(debito.valorAtualizado) || 0;
  }
  for (const pagamento of getCadastros().pagamentosAcordo) {
    const dia = pagamento.dataPagamento.slice(0, 10);
    if (!dia || !dentro(dia, inicio, fim)) continue;
    if (!ids.has(pagamento.unidadeId)) continue;
    total += Number(pagamento.valor) || 0;
  }
  return total;
}

function atendimentosUnidade(unidadeId: number): Atendimento[] {
  return getCadastros()
    .atendimentos.filter((item) => Number(item.unidadeId) === unidadeId)
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora));
}

function atendimentoAbertoMaisRecente(unidadeId: number): Atendimento | undefined {
  return atendimentosUnidade(unidadeId).find((item) => item.status === "Pendente");
}

function encaminhamentoJuridicoAtivo(userId: number, unidadeId: number): boolean {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "juridico", "ler")) return false;
  return listarEncaminhamentosJuridicos(userId).some(
    (item) =>
      item.unidadeId === unidadeId &&
      item.status !== "Arquivado" &&
      item.status !== "Retornado à cobrança amigável",
  );
}

function emNegociacaoAtiva(unidade: Unidade): boolean {
  if (situacaoCobrancaUnidade(unidade) === "Em acordo") return true;
  return getCadastros().propostasNegociacao.some(
    (item) => item.unidadeId === unidade.id && propostaContaComoNegociacaoCriada(item),
  );
}

/** Classificação por unidade na fila — prioridade fixa, sem duplicidade entre fatias. */
export function classificarSituacaoCarteiraUnidade(
  userId: number,
  unidade: Unidade,
  hoje = hojeIso(),
): SituacaoCarteiraId {
  const situacao = situacaoCobrancaUnidade(unidade);

  if (situacao === "Ajuizada" || encaminhamentoJuridicoAtivo(userId, unidade.id)) {
    return "encaminhado_juridico";
  }
  if (emNegociacaoAtiva(unidade)) return "em_negociacao";
  if (situacao === "Quitada") return "concluido";

  const aberto = atendimentoAbertoMaisRecente(unidade.id);
  if (aberto) {
    if (aguardandoRetornoTerceiro(aberto)) return "aguardando_retorno";
    if (atendimentoPendenteAcao(aberto, hoje)) return "aguardando_atendimento";
    return "em_acompanhamento";
  }

  const ultimo = atendimentosUnidade(unidade.id)[0];
  if (ultimo?.status === "Resolvido") return "concluido";

  if (situacao === "Notificada") return "em_acompanhamento";
  if (atendimentosUnidade(unidade.id).length === 0) return "aguardando_atendimento";
  return "em_acompanhamento";
}

function distribuicaoFaixas(debitos: Debito[], dataBase: string, total: number): GraficoDistribuicaoValor[] {
  return FAIXAS_ATRASO_DASHBOARD_ATENDENTE.map((faixa) => {
    const itens = debitos.filter((item) => {
      const dias = diasDeAtraso(item.dataVencimento, dataBase);
      return dias >= faixa.min && dias <= faixa.max;
    });
    const valor = somarValorAtualizadoSemDuplicata(itens);
    return {
      id: faixa.id,
      nome: faixa.label,
      valor,
      quantidade: itens.length,
      percentual: total > 0 ? (valor / total) * 100 : null,
    };
  });
}

function distribuicaoSituacaoFiltrada(userId: number, hoje: string, fila: ReturnType<typeof listarFilaCobranca>): GraficoDistribuicaoValor[] {
  const cadastros = getCadastros();
  const contagens = new Map<SituacaoCarteiraId, number>();
  for (const id of Object.keys(ROTULOS_SITUACAO) as SituacaoCarteiraId[]) {
    contagens.set(id, 0);
  }
  for (const item of fila) {
    const unidade = cadastros.unidades.find((u) => u.id === item.unidadeId);
    if (!unidade) continue;
    const cat = classificarSituacaoCarteiraUnidade(userId, unidade, hoje);
    contagens.set(cat, (contagens.get(cat) ?? 0) + 1);
  }
  const total = fila.length;
  return (Object.keys(ROTULOS_SITUACAO) as SituacaoCarteiraId[]).map((id) => {
    const quantidade = contagens.get(id) ?? 0;
    return {
      id,
      nome: ROTULOS_SITUACAO[id],
      valor: quantidade,
      quantidade,
      percentual: total > 0 ? (quantidade / total) * 100 : null,
    };
  });
}

function inadimplenciaPorCondominioFiltrada(
  userId: number,
  dataBase: string,
  debitos: Debito[],
  unidadeIds: Set<number> | null | undefined,
): GraficoCondominioLinha[] {
  const cadastros = getCadastros();
  const idsCondominio = new Set(debitos.map((item) => item.condominioId));
  const idsCarteira = unidadeIdsCarteiraVigente(userId);

  return [...idsCondominio]
    .map((condominioId) => {
      const itens = debitos.filter((item) => item.condominioId === condominioId);
      return {
        condominioId,
        nome: cadastros.condominios.find((item) => item.id === condominioId)?.nome ?? "—",
        unidadesInadimplentes: new Set(itens.map((item) => item.unidadeId)).size,
        valorOriginal: somarValorOriginalSemDuplicata(itens),
        valorAtualizado: somarValorAtualizadoSemDuplicata(itens),
      };
    })
    .filter((linha) => {
      const unidadesCondominio = escopoUnidades(cadastros, userId).filter(
        (item) => item.condominioId === linha.condominioId && idsCarteira.has(item.id),
      );
      return unidadesCondominio.length > 0;
    })
    .sort((a, b) => b.valorAtualizado - a.valorAtualizado);
}

function evolucaoCarteiraMensalFiltrada(
  userId: number,
  dataBase: string,
  limiteDias: number,
  unidadeIds: Set<number> | null | undefined,
): GraficoEvolucaoMes[] {
  const meses = mesesEvolucaoAteDataBase(dataBase);
  let saldoAnterior: number | null = null;
  return meses.map((mes) => {
    const fimMes = ultimoDiaMes(mes);
    const inicioMes = primeiroDiaMes(mes);
    const dataRef = fimMes > dataBase ? dataBase : fimMes;
    const saldoAberto = saldoAbertoNaDataFiltrado(userId, dataRef, limiteDias, unidadeIds);
    const recuperacaoFinanceira = somarRecuperacaoFinanceiraNoPeriodoFiltrado(
      userId,
      inicioMes,
      fimMes > dataBase ? dataBase : fimMes,
      unidadeIds,
    );
    const variacaoSaldo = saldoAnterior != null ? saldoAberto - saldoAnterior : null;
    saldoAnterior = saldoAberto;
    return {
      mes,
      mesRotulo: rotuloMes(mes),
      dataBaseMes: dataRef,
      saldoAberto,
      recuperacaoFinanceira,
      variacaoSaldo,
    };
  });
}

export function montarGraficosAtendente(
  userId: number,
  input: { dataBase: string; limiteDias: number },
  unidadeIds?: Set<number> | null,
): DashboardGraficosAtendente | null {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "debitos", "ler")) return null;

  const hoje = hojeIso();
  let debitos = debitosAbertosCarteira(userId, input.dataBase);
  if (unidadeIds) debitos = debitos.filter((item) => unidadeIds.has(item.unidadeId));
  const totalAtualizado = somarValorAtualizadoSemDuplicata(debitos);
  let fila = listarFilaCobranca(userId);
  if (unidadeIds) fila = fila.filter((item) => unidadeIds.has(item.unidadeId));

  return {
    faixasAtraso: distribuicaoFaixas(debitos, input.dataBase, totalAtualizado),
    porSituacao: distribuicaoSituacaoFiltrada(userId, hoje, fila),
    porCondominio: inadimplenciaPorCondominioFiltrada(userId, input.dataBase, debitos, unidadeIds),
    evolucaoMensal: evolucaoCarteiraMensalFiltrada(userId, input.dataBase, input.limiteDias, unidadeIds),
    totais: {
      debitosConsiderados: debitos.length,
      unidadesNaFila: fila.length,
    },
    regras: {
      faixasAtraso:
        "Dias de atraso = diferença entre a data-base e o vencimento do débito (diasDeAtraso). Cada débito entra em uma única faixa; valores somam valorAtualizado com deduplicação por identificador_externo.",
      situacaoCarteira:
        "Uma unidade por fatia na fila da carteira vigente (collection_assignment). Prioridade: jurídico → negociação → quitada/concluído → aguardando retorno → aguardando atendimento → em acompanhamento.",
      evolucao:
        "Saldo em aberto no último dia de cada mês (débitos abertos na data). Recuperação financeira = pagamentos de débitos e de acordos no mês, com data de pagamento persistida. Variação de saldo é a diferença mês a mês — não equivale automaticamente à recuperação.",
    },
  };
}

/** Intervalo de vencimento que corresponde à faixa na data-base (para filtros em /debitos). */
export function vencimentoParaFaixaDashboard(faixaId: FaixaAtrasoDashboardId, dataBase: string) {
  const faixa = FAIXAS_ATRASO_DASHBOARD_ATENDENTE.find((item) => item.id === faixaId);
  if (!faixa) return null;
  if (faixa.max === Number.POSITIVE_INFINITY) {
    return { vencimentoAte: deslocarDias(dataBase, -faixa.min) };
  }
  const vencimentoAte = deslocarDias(dataBase, -faixa.min);
  const vencimentoDe = deslocarDias(dataBase, -faixa.max);
  return { vencimentoDe, vencimentoAte };
}
