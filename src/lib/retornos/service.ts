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
  situacaoAgenda: "atrasado" | "hoje" | "semana" | "agendado" | "concluido";
  dataHoraAtendimento: string;
  atendimentoAutorId: number;
  atendimentoAutorNome: string;
  proximaAcao: string;
  observacao: string;
  retornoConcluidoEm: string | null;
  retornoConcluidoPorId: number | null;
  retornoConcluidoPorNome: string | null;
};

export type RetornoAgendaFiltros = {
  estado?: "pendente" | "concluido" | "todos";
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
    concluidos: number;
  };
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

  const concluido = Boolean(atendimento.retornoConcluidoEm?.trim());
  const situacaoAgenda = concluido
    ? ("concluido" as const)
    : (situacaoRetorno(atendimento.dataProximaAcao) || "agendado");

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
    proximos: todosNoEscopo.filter(
      (item) => item.situacaoAgenda === "semana" || item.situacaoAgenda === "agendado",
    ).length,
    concluidos: todosNoEscopo.filter((item) => item.situacaoAgenda === "concluido").length,
  };

  let lista = listaEscopo;
  const estado = filtros?.estado ?? "pendente";
  if (estado === "pendente") {
    lista = lista.filter((item) => !item.retornoConcluidoEm?.trim());
  } else if (estado === "concluido") {
    lista = lista.filter((item) => Boolean(item.retornoConcluidoEm?.trim()));
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
