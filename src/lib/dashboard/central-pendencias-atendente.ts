import { nomeCondominio, retornoPendente, situacaoCobrancaUnidade, situacaoRetorno, type Atendimento } from "@/data/catalogo";
import { getCadastros } from "@/data/catalogo-store";
import { codigoReDoUsuario } from "@/lib/colaboradores/re-server";
import { listarFilaCobranca, type FilaCobrancaItem } from "@/lib/fila/service";
import { hojeEmFuso, dataHoraPartesEmFuso, FUSO_NOTIFICACOES } from "@/lib/notificacoes/timezone";
import {
  aguardandoRetornoTerceiro,
  atendimentoNaCarteiraVigente,
} from "@/lib/dashboard/indicadores-operacionais-atendente";

/** Dias sem registro de atendimento para classificar como «sem movimentação» (não é atraso de retorno). */
export const DIAS_SEM_MOVIMENTACAO = 7;

export type PendenciaOrdenacao = "prioridade" | "data_retorno" | "ultima_movimentacao";

export {
  CATEGORIAS_PENDENCIA,
  ROTULO_TIPO_PENDENCIA,
  type CategoriaPendenciaId,
  type TipoPendenciaId,
} from "@/lib/dashboard/pendencias-labels";
import {
  CATEGORIAS_PENDENCIA,
  ROTULO_TIPO_PENDENCIA,
  type CategoriaPendenciaId,
  type TipoPendenciaId,
} from "@/lib/dashboard/pendencias-labels";

const PRIORIDADE_TIPO: Record<TipoPendenciaId, number> = {
  prioritarias: 0,
  atrasadas: 1,
  hoje: 2,
  aguardando_resposta: 3,
  proximos_retornos: 4,
  sem_movimentacao: 5,
};

const MOTIVOS_ATENCAO = new Set([
  "Já pagou (enviar comprovante)",
  "Aguarda proposta de acordo",
  "Recusa-se a pagar",
]);

export type CentralPendenciaRegistro = {
  unidadeId: number;
  atendimentoId: string | null;
  codigoRe: string | null;
  condominioId: number;
  condominioNome: string;
  unidadeLabel: string;
  tipoPendencia: TipoPendenciaId;
  situacaoAtual: string;
  dataUltimaMovimentacao: string | null;
  dataProximoRetorno: string | null;
  responsavelRe: string | null;
  tempoDesdeUltimaMovimentacao: string;
  destaqueAtrasado: boolean;
};

export type CentralPendenciasResumo = Record<CategoriaPendenciaId, number>;

export type CentralPendenciasResultado = {
  hoje: string;
  fuso: string;
  resumo: CentralPendenciasResumo;
  itens: CentralPendenciaRegistro[];
  total: number;
  page: number;
  pageSize: number;
};

export type CentralPendenciasFiltros = {
  categoria?: CategoriaPendenciaId | "todas";
  tipo?: TipoPendenciaId;
  ordenacao?: PendenciaOrdenacao;
  ordem?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

function rotuloUnidade(item: FilaCobrancaItem) {
  if (item.bloco) return `${item.identificacao} - ${item.bloco}`;
  return item.identificacao;
}

function atendimentosUnidade(unidadeId: number): Atendimento[] {
  return getCadastros()
    .atendimentos.filter((item) => Number(item.unidadeId) === unidadeId)
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora));
}

function atendimentoReferencia(unidadeId: number): Atendimento | null {
  const lista = atendimentosUnidade(unidadeId);
  const pendenteRetorno = lista.find(
    (item) =>
      item.status === "Pendente" &&
      item.dataProximaAcao?.trim() &&
      !item.retornoConcluidoEm?.trim(),
  );
  if (pendenteRetorno) return pendenteRetorno;
  const aguardando = lista.find((item) => item.status === "Pendente" && aguardandoRetornoTerceiro(item));
  if (aguardando) return aguardando;
  const pendente = lista.find((item) => item.status === "Pendente");
  return pendente ?? null;
}

function diasEntreDatas(inicio: string, fim: string) {
  const a = Date.parse(`${inicio}T12:00:00`);
  const b = Date.parse(`${fim}T12:00:00`);
  if (Number.isNaN(a) || Number.isNaN(b)) return 0;
  return Math.floor((b - a) / 86_400_000);
}

export function formatarTempoDesdeUltimaMovimentacao(
  dataHora: string | null,
  hoje: string,
  fuso = FUSO_NOTIFICACOES,
): string {
  if (!dataHora?.trim()) return "Sem registro";
  const partes = dataHoraPartesEmFuso(dataHora, fuso);
  if (!partes) return "—";
  const dias = diasEntreDatas(partes.data, hoje);
  if (dias === 0) return "Hoje";
  if (dias === 1) return "1 dia";
  if (dias < 30) return `${dias} dias`;
  const meses = Math.floor(dias / 30);
  return meses === 1 ? "1 mês" : `${meses} meses`;
}

function prioritarioPorMotivo(atendimento: Atendimento | null): boolean {
  if (!atendimento || atendimento.status !== "Pendente") return false;
  return atendimento.respondeu === "Sim" && MOTIVOS_ATENCAO.has(atendimento.motivo);
}

function retornoAberto(atendimento: Atendimento | null, hoje: string) {
  if (!atendimento || atendimento.status !== "Pendente") return null;
  if (!atendimento.dataProximaAcao?.trim() || atendimento.retornoConcluidoEm?.trim()) return null;
  return situacaoRetorno(atendimento.dataProximaAcao, hoje);
}

function semMovimentacaoRelevante(item: FilaCobrancaItem, hoje: string): boolean {
  if (!item.ultimoAtendimento?.trim()) return true;
  const dia = item.ultimoAtendimento.slice(0, 10);
  return diasEntreDatas(dia, hoje) >= DIAS_SEM_MOVIMENTACAO;
}

export function classificarTipoPendenciaUnidade(
  item: FilaCobrancaItem,
  atendimento: Atendimento | null,
  hoje = hojeEmFuso(),
): TipoPendenciaId | null {
  if (prioritarioPorMotivo(atendimento)) {
    return "prioritarias";
  }
  const sitRetorno = retornoAberto(atendimento, hoje);
  if (sitRetorno === "atrasado") return "atrasadas";
  if (sitRetorno === "hoje") return "hoje";
  if (atendimento && aguardandoRetornoTerceiro(atendimento) && atendimento.respondeu === "Não") {
    return "aguardando_resposta";
  }
  if (sitRetorno === "semana" || sitRetorno === "agendado") return "proximos_retornos";
  if (item.proximoRetorno && retornoPendente(atendimento ?? { status: "Pendente", dataProximaAcao: item.proximoRetorno, retornoConcluidoEm: "" })) {
    const sit = situacaoRetorno(item.proximoRetorno, hoje);
    if (sit === "semana" || sit === "agendado") return "proximos_retornos";
  }
  if (semMovimentacaoRelevante(item, hoje)) return "sem_movimentacao";
  return null;
}

function montarRegistro(
  item: FilaCobrancaItem,
  tipo: TipoPendenciaId,
  atendimento: Atendimento | null,
  hoje: string,
  fuso: string,
): CentralPendenciaRegistro {
  const unidade = getCadastros().unidades.find((u) => u.id === item.unidadeId);
  const situacaoAtual = unidade ? situacaoCobrancaUnidade(unidade) : item.situacao;
  const dataUltima = item.ultimoAtendimento;
  const retornoSit = item.proximoRetorno ? situacaoRetorno(item.proximoRetorno, hoje) : "";
  const destaqueAtrasado =
    tipo === "atrasadas" || retornoSit === "atrasado" || (tipo === "prioritarias" && retornoSit === "atrasado");
  let responsavelRe = item.codigoRe;
  if (!responsavelRe && item.atendenteId) {
    const usuario = getCadastros().usuarios.find((u) => u.id === item.atendenteId);
    if (usuario) responsavelRe = codigoReDoUsuario(usuario);
  }

  return {
    unidadeId: item.unidadeId,
    atendimentoId:
      atendimento?.id ??
      (item.proximoRetornoAtendimentoId?.trim() ? item.proximoRetornoAtendimentoId : null),
    codigoRe: item.codigoRe,
    condominioId: item.condominioId,
    condominioNome: nomeCondominio(item.condominioId),
    unidadeLabel: rotuloUnidade(item),
    tipoPendencia: tipo,
    situacaoAtual,
    dataUltimaMovimentacao: dataUltima,
    dataProximoRetorno: item.proximoRetorno,
    responsavelRe,
    tempoDesdeUltimaMovimentacao: formatarTempoDesdeUltimaMovimentacao(dataUltima, hoje, fuso),
    destaqueAtrasado,
  };
}

function ordenarRegistros(
  itens: CentralPendenciaRegistro[],
  ordenacao: PendenciaOrdenacao,
  ordem: "asc" | "desc",
) {
  const factor = ordem === "desc" ? -1 : 1;
  return [...itens].sort((a, b) => {
    let cmp = 0;
    if (ordenacao === "prioridade") {
      cmp = PRIORIDADE_TIPO[a.tipoPendencia] - PRIORIDADE_TIPO[b.tipoPendencia];
      if (cmp === 0) {
        cmp = (a.condominioNome ?? "").localeCompare(b.condominioNome ?? "", "pt-BR");
      }
    } else if (ordenacao === "data_retorno") {
      const left = a.dataProximoRetorno ?? "9999-99-99";
      const right = b.dataProximoRetorno ?? "9999-99-99";
      cmp = left.localeCompare(right);
    } else {
      const left = a.dataUltimaMovimentacao ?? "0000-00-00";
      const right = b.dataUltimaMovimentacao ?? "0000-00-00";
      cmp = left.localeCompare(right);
    }
    if (cmp !== 0) return cmp * factor;
    return a.unidadeId - b.unidadeId;
  });
}

function listarBase(userId: number): CentralPendenciaRegistro[] {
  const hoje = hojeEmFuso();
  const fuso = FUSO_NOTIFICACOES;
  const fila = listarFilaCobranca(userId);
  const registros: CentralPendenciaRegistro[] = [];

  for (const item of fila) {
    const atendimento = atendimentoReferencia(item.unidadeId);
    if (atendimento && !atendimentoNaCarteiraVigente(userId, atendimento)) continue;
    const tipo = classificarTipoPendenciaUnidade(item, atendimento, hoje);
    if (!tipo) continue;
    registros.push(montarRegistro(item, tipo, atendimento, hoje, fuso));
  }

  return registros;
}

export function contarResumoCentralPendencias(userId: number): CentralPendenciasResumo {
  const base = listarBase(userId);
  const resumo: CentralPendenciasResumo = {
    hoje: 0,
    atrasadas: 0,
    proximos_retornos: 0,
    aguardando_resposta: 0,
    sem_movimentacao: 0,
    prioritarias: 0,
  };
  for (const item of base) resumo[item.tipoPendencia] += 1;
  return resumo;
}

export function listarCentralPendenciasAtendente(
  userId: number,
  filtros?: CentralPendenciasFiltros,
): CentralPendenciasResultado {
  const hoje = hojeEmFuso();
  const fuso = FUSO_NOTIFICACOES;
  const categoria = filtros?.categoria ?? "todas";
  const tipoFiltro = filtros?.tipo;
  const ordenacao = filtros?.ordenacao ?? "prioridade";
  const ordem = filtros?.ordem ?? "asc";
  const page = Math.max(1, filtros?.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filtros?.pageSize ?? 10));

  let itens = listarBase(userId);

  if (categoria !== "todas") {
    itens = itens.filter((item) => item.tipoPendencia === categoria);
  }
  if (tipoFiltro) {
    itens = itens.filter((item) => item.tipoPendencia === tipoFiltro);
  }

  const total = itens.length;
  const ordenados = ordenarRegistros(itens, ordenacao, ordem);
  const start = (page - 1) * pageSize;

  return {
    hoje,
    fuso,
    resumo: contarResumoCentralPendencias(userId),
    itens: ordenados.slice(start, start + pageSize),
    total,
    page,
    pageSize,
  };
}
