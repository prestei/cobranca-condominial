import { debitoAbertoNaData, diasDeAtraso, escopoUnidades, hojeIso, situacaoCobrancaUnidade, type Atendimento, type Debito, type Unidade } from "@/data/catalogo";
import { getCadastros } from "@/data/catalogo-store";
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

export {
  FAIXAS_ATRASO_DASHBOARD_ATENDENTE,
  vencimentoParaFaixaDashboard,
  type FaixaAtrasoDashboardId,
} from "@/lib/dashboard/faixas-atraso";
import { FAIXAS_ATRASO_DASHBOARD_ATENDENTE, type FaixaAtrasoDashboardId } from "@/lib/dashboard/faixas-atraso";

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

function saldoAbertoNaData(userId: number, dataBase: string, limiteDias: number) {
  const unidadesCarteira = unidadeIdsCarteiraVigente(userId).size;
  const debitos = debitosCarteiraVigente(userId);
  return calcularIndicadoresInadimplencia({
    debitos,
    dataBase,
    limiteDias,
    unidadesCarteira,
  }).totalAtualizado;
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

function distribuicaoSituacao(userId: number, hoje: string): GraficoDistribuicaoValor[] {
  const fila = listarFilaCobranca(userId);
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

function inadimplenciaPorCondominio(userId: number, dataBase: string): GraficoCondominioLinha[] {
  const cadastros = getCadastros();
  const debitos = debitosAbertosCarteira(userId, dataBase);
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

export function evolucaoCarteiraMensal(userId: number, dataBase: string, limiteDias: number): GraficoEvolucaoMes[] {
  const meses = mesesEvolucaoAteDataBase(dataBase);
  let saldoAnterior: number | null = null;
  return meses.map((mes) => {
    const fimMes = ultimoDiaMes(mes);
    const inicioMes = primeiroDiaMes(mes);
    const dataRef = fimMes > dataBase ? dataBase : fimMes;
    const saldoAberto = saldoAbertoNaData(userId, dataRef, limiteDias);
    const recuperacaoFinanceira = somarRecuperacaoFinanceiraNoPeriodo(
      userId,
      inicioMes,
      fimMes > dataBase ? dataBase : fimMes,
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
): DashboardGraficosAtendente | null {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "debitos", "ler")) return null;

  const hoje = hojeIso();
  const debitos = debitosAbertosCarteira(userId, input.dataBase);
  const totalAtualizado = somarValorAtualizadoSemDuplicata(debitos);
  const fila = listarFilaCobranca(userId);

  return {
    faixasAtraso: distribuicaoFaixas(debitos, input.dataBase, totalAtualizado),
    porSituacao: distribuicaoSituacao(userId, hoje),
    porCondominio: inadimplenciaPorCondominio(userId, input.dataBase),
    evolucaoMensal: evolucaoCarteiraMensal(userId, input.dataBase, input.limiteDias),
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
