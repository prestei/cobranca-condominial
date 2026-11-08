import {
  escopoCondominios,
  getCadastros,
  nomeCondominio,
  nomeUnidade,
  situacaoRetorno,
  type Atendimento,
  type AtribuicaoCobranca,
} from "@/data/catalogo";
import { codigoReDoUsuario, identificadorColaboradorPorId } from "@/lib/colaboradores/re";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";
import {
  retornoAgendaAtivo,
  retornoFoiCancelado,
  retornoFoiConcluido,
  situacaoAcompanhamentoRetorno,
  type SituacaoAcompanhamentoRetorno,
} from "@/lib/retornos/status";

export class RetornoServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type RetornoAgendaItem = {
  atendimentoId: string;
  unidadeId: number;
  condominioId: number;
  condominioNome: string;
  unidadeLabel: string;
  codigoRe: string | null;
  atendenteCarteiraId: number | null;
  dataPrevista: string;
  situacaoAgenda: "atrasado" | "hoje" | "semana" | "agendado" | "concluido" | "cancelado";
  dataHoraAtendimento: string;
  atendimentoAutorId: number;
  atendimentoAutorNome: string;
  proximaAcao: string;
  observacao: string;
  retornoConcluidoEm: string | null;
  retornoConcluidoPorId: number | null;
  retornoConcluidoPorNome: string | null;
  retornoCanceladoEm: string | null;
  retornoCanceladoMotivo: string;
  situacaoAcompanhamento: SituacaoAcompanhamentoRetorno;
};

export type RetornoAgendaFiltros = {
  estado?: "pendente" | "concluido" | "cancelado" | "todos";
  situacao?: "atrasado" | "hoje" | "semana" | "agendado" | "todos";
  de?: string;
  ate?: string;
  condominioId?: number;
  atendenteId?: number;
  codigoRe?: string;
  busca?: string;
};

export type RetornoAgendaResultado = {
  itens: RetornoAgendaItem[];
  total: number;
  resumo: {
    atrasados: number;
    hoje: number;
    proximos: number;
    futuros: number;
    concluidos: number;
  };
};

export type HistoricoRetornoEvento = {
  id: string;
  dataHora: string;
  tipo: "agendamento" | "reprogramacao" | "atualizacao" | "conclusao" | "cancelamento";
  autorNome: string;
  dataPrevista?: string;
  proximaAcao?: string;
  descricao?: string;
  justificativa?: string;
};

function usuarioVeCarteiraGeral(userId: number) {
  const perm = permissoesDoUsuarioId(userId);
  return temPermissao(perm, "usuarios", "criar");
}

function atribuicaoVigente(unidadeId: number): AtribuicaoCobranca | undefined {
  return getCadastros().atribuicoesCobranca.find((item) => item.unidadeId === unidadeId && !item.encerradoEm);
}

function unidadeIdsNaCarteira(userId: number): Set<number> | null {
  if (usuarioVeCarteiraGeral(userId)) return null;
  const ids = new Set<number>();
  for (const item of getCadastros().atribuicoesCobranca) {
    if (!item.encerradoEm && item.atendenteId === userId) ids.add(item.unidadeId);
  }
  return ids;
}

function montarItem(atendimento: Atendimento): RetornoAgendaItem | null {
  if (!atendimento.dataProximaAcao.trim()) return null;

  const unidadeId = Number(atendimento.unidadeId);
  const unidade = getCadastros().unidades.find((item) => item.id === unidadeId);
  if (!unidade) return null;

  const cancelado = retornoFoiCancelado(atendimento);
  const concluido = retornoFoiConcluido(atendimento);
  const situacaoAgenda = cancelado
    ? ("cancelado" as const)
    : concluido
      ? ("concluido" as const)
      : (situacaoRetorno(atendimento.dataProximaAcao) || "agendado");
  const acompanhamento = situacaoAcompanhamentoRetorno(atendimento);

  const vigente = atribuicaoVigente(unidadeId);
  const atendenteCarteira = vigente
    ? getCadastros().usuarios.find((item) => item.id === vigente.atendenteId)
    : undefined;

  const concluidoPorId = atendimento.retornoConcluidoPorId;
  return {
    atendimentoId: atendimento.id,
    unidadeId,
    condominioId: unidade.condominioId,
    condominioNome: nomeCondominio(unidade.condominioId),
    unidadeLabel: nomeUnidade(unidadeId),
    codigoRe: atendenteCarteira ? codigoReDoUsuario(atendenteCarteira) : null,
    atendenteCarteiraId: vigente?.atendenteId ?? null,
    dataPrevista: atendimento.dataProximaAcao,
    situacaoAgenda,
    dataHoraAtendimento: atendimento.dataHora,
    atendimentoAutorId: atendimento.usuarioId,
    atendimentoAutorNome: identificadorColaboradorPorId(atendimento.usuarioId),
    proximaAcao: atendimento.proximaAcao,
    observacao: atendimento.descricao,
    retornoConcluidoEm: concluido ? atendimento.retornoConcluidoEm : null,
    retornoConcluidoPorId: concluidoPorId,
    retornoConcluidoPorNome: concluidoPorId != null ? identificadorColaboradorPorId(concluidoPorId) : null,
    retornoCanceladoEm: cancelado ? atendimento.retornoCanceladoEm : null,
    retornoCanceladoMotivo: cancelado ? atendimento.retornoCanceladoMotivo : "",
    situacaoAcompanhamento: acompanhamento,
  };
}

function dentroPeriodo(data: string, de?: string, ate?: string) {
  if (de && data < de) return false;
  if (ate && data > ate) return false;
  return true;
}

export function listarRetornosAgenda(
  userId: number,
  filtros?: RetornoAgendaFiltros,
  paginacao?: { page: number; pageSize: number },
): RetornoAgendaResultado {
  const idsCondominio = new Set(escopoCondominios(getCadastros(), userId).map((item) => item.id));
  const carteiraIds = unidadeIdsNaCarteira(userId);

  const listaEscopo = getCadastros()
    .atendimentos.filter((item) => item.dataProximaAcao.trim())
    .filter((item) => {
      const unidade = getCadastros().unidades.find((u) => u.id === Number(item.unidadeId));
      if (!unidade || !idsCondominio.has(unidade.condominioId)) return false;
      if (carteiraIds && !carteiraIds.has(unidade.id)) return false;
      return true;
    });

  const todosNoEscopo = listaEscopo
    .map(montarItem)
    .filter((item): item is RetornoAgendaItem => item !== null);

  const resumo = {
    atrasados: todosNoEscopo.filter((item) => item.situacaoAgenda === "atrasado").length,
    hoje: todosNoEscopo.filter((item) => item.situacaoAgenda === "hoje").length,
    proximos: todosNoEscopo.filter((item) => item.situacaoAgenda === "semana").length,
    futuros: todosNoEscopo.filter((item) => item.situacaoAgenda === "agendado").length,
    concluidos: todosNoEscopo.filter((item) => item.situacaoAgenda === "concluido").length,
  };

  let lista = listaEscopo;
  const estado = filtros?.estado ?? "pendente";
  if (estado === "pendente") {
    lista = lista.filter((item) => retornoAgendaAtivo(item));
  } else if (estado === "concluido") {
    lista = lista.filter((item) => retornoFoiConcluido(item));
  } else if (estado === "cancelado") {
    lista = lista.filter((item) => retornoFoiCancelado(item));
  }

  const itensBrutos = lista.map(montarItem).filter((item): item is RetornoAgendaItem => item !== null);

  let itens = itensBrutos;

  if (filtros?.condominioId) {
    itens = itens.filter((item) => item.condominioId === filtros.condominioId);
  }
  if (usuarioVeCarteiraGeral(userId) && filtros?.atendenteId) {
    itens = itens.filter((item) => item.atendenteCarteiraId === filtros.atendenteId);
  }
  if (usuarioVeCarteiraGeral(userId) && filtros?.codigoRe?.trim()) {
    const alvo = filtros.codigoRe.trim().toUpperCase();
    itens = itens.filter((item) => item.codigoRe?.toUpperCase() === alvo);
  }

  const de = filtros?.de?.trim();
  const ate = filtros?.ate?.trim();
  if (de || ate) {
    itens = itens.filter((item) => {
      const referencia =
        item.situacaoAgenda === "concluido" && item.retornoConcluidoEm
          ? item.retornoConcluidoEm.slice(0, 10)
          : item.dataPrevista;
      return dentroPeriodo(referencia, de, ate);
    });
  }

  if (filtros?.situacao && filtros.situacao !== "todos") {
    itens = itens.filter((item) => item.situacaoAgenda === filtros.situacao);
  }

  const termo = filtros?.busca?.trim().toLocaleLowerCase("pt-BR");
  if (termo) {
    itens = itens.filter((item) => {
      const texto = `${item.condominioNome} ${item.unidadeLabel} ${item.proximaAcao} ${item.observacao} ${item.codigoRe ?? ""}`.toLocaleLowerCase(
        "pt-BR",
      );
      return texto.includes(termo);
    });
  }

  itens.sort((a, b) => {
    if (a.situacaoAgenda === "concluido" && b.situacaoAgenda === "concluido") {
      return (b.retornoConcluidoEm ?? "").localeCompare(a.retornoConcluidoEm ?? "");
    }
    if (a.situacaoAgenda === "concluido") return 1;
    if (b.situacaoAgenda === "concluido") return -1;
    const cmp = a.dataPrevista.localeCompare(b.dataPrevista);
    if (cmp !== 0) return cmp;
    return a.dataHoraAtendimento.localeCompare(b.dataHoraAtendimento);
  });

  const total = itens.length;
  if (paginacao) {
    const inicio = (paginacao.page - 1) * paginacao.pageSize;
    itens = itens.slice(inicio, inicio + paginacao.pageSize);
  }

  return { itens, total, resumo };
}

export function listarHistoricoRetornosAtendimento(userId: number, atendimentoId: string): HistoricoRetornoEvento[] {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "atendimentos", "ler")) {
    throw new RetornoServiceError("Sem permissão para consultar histórico.", 403);
  }

  const atendimento = getCadastros().atendimentos.find((item) => item.id === atendimentoId);
  if (!atendimento || !atendimento.dataProximaAcao.trim()) {
    throw new RetornoServiceError("Retorno não encontrado neste atendimento.", 404);
  }

  const unidadeId = Number(atendimento.unidadeId);
  const unidade = getCadastros().unidades.find((item) => item.id === unidadeId);
  if (!unidade || !escopoCondominios(getCadastros(), userId).some((c) => c.id === unidade.condominioId)) {
    throw new RetornoServiceError("Atendimento fora do seu escopo.", 403);
  }

  const carteiraIds = unidadeIdsNaCarteira(userId);
  if (carteiraIds && !carteiraIds.has(unidadeId)) {
    throw new RetornoServiceError("Atendimento fora da sua carteira vigente.", 403);
  }

  const eventos: HistoricoRetornoEvento[] = [
    {
      id: `origem-${atendimento.id}`,
      dataHora: atendimento.dataHora,
      tipo: "agendamento",
      autorNome: identificadorColaboradorPorId(atendimento.usuarioId),
      dataPrevista: atendimento.dataProximaAcao,
      proximaAcao: atendimento.proximaAcao,
      descricao: atendimento.descricao,
    },
  ];

  for (const registro of getCadastros().auditoria) {
    if (registro.entidade !== "service_ticket" || registro.registroId !== atendimentoId) continue;
    const campos = registro.camposAlterados.toLowerCase();
    if (
      !campos.includes("retorno") &&
      !campos.includes("reprogramacao") &&
      !campos.includes("cancelamento")
    ) {
      continue;
    }

    const autorId = Number(registro.usuarioId);
    const autorNome = Number.isFinite(autorId) ? identificadorColaboradorPorId(autorId) : registro.usuarioId;
    let tipo: HistoricoRetornoEvento["tipo"] = "atualizacao";
    if (registro.camposAlterados.includes("reprogramacao_retorno")) tipo = "reprogramacao";
    else if (registro.camposAlterados.includes("retorno_cancelado")) tipo = "cancelamento";
    else if (registro.camposAlterados.includes("retorno_concluido")) tipo = "conclusao";
    else if (registro.camposAlterados.includes("retorno_agendado")) tipo = "agendamento";

    let dataPrevista: string | undefined;
    let proximaAcao: string | undefined;
    let descricao: string | undefined;
    let justificativa: string | undefined;
    try {
      const novos = JSON.parse(registro.dadosNovos) as Record<string, unknown>;
      if (typeof novos.dataProximaAcao === "string") dataPrevista = novos.dataProximaAcao;
      if (typeof novos.proximaAcao === "string") proximaAcao = novos.proximaAcao;
      if (typeof novos.descricao === "string") descricao = novos.descricao;
      if (typeof novos.retornoCanceladoMotivo === "string") justificativa = novos.retornoCanceladoMotivo;
    } catch {
      /* auditoria legada */
    }

    eventos.push({
      id: `audit-${registro.id}`,
      dataHora: registro.dataHora,
      tipo,
      autorNome,
      dataPrevista,
      proximaAcao,
      descricao,
      justificativa,
    });
  }

  if (atendimento.retornoConcluidoEm?.trim() && atendimento.retornoConcluidoPorId) {
    eventos.push({
      id: `conclusao-${atendimento.id}`,
      dataHora: atendimento.retornoConcluidoEm,
      tipo: "conclusao",
      autorNome: identificadorColaboradorPorId(atendimento.retornoConcluidoPorId),
      dataPrevista: atendimento.dataProximaAcao,
      proximaAcao: atendimento.proximaAcao,
    });
  }
  if (atendimento.retornoCanceladoEm?.trim()) {
    eventos.push({
      id: `cancelamento-${atendimento.id}`,
      dataHora: atendimento.retornoCanceladoEm,
      tipo: "cancelamento",
      autorNome: identificadorColaboradorPorId(atendimento.retornoCanceladoPorId ?? atendimento.usuarioId),
      dataPrevista: atendimento.dataProximaAcao,
      proximaAcao: atendimento.proximaAcao,
      justificativa: atendimento.retornoCanceladoMotivo,
    });
  }

  eventos.sort((a, b) => a.dataHora.localeCompare(b.dataHora));
  return eventos;
}
