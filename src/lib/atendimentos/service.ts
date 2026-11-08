import {
  agoraIso,
  canaisAtendimento,
  escopoCondominios,
  escopoUnidades,
  getCadastros,
  motivosPendencia,
  registrarAuditoria,
  setAtendimentos,
  statusAtendimento,
  type Atendimento,
  type AtribuicaoCobranca,
} from "@/data/catalogo";
import {
  listarAtendimentosIndicadorOperacional,
  type IndicadorOperacionalAtendenteId,
} from "@/lib/dashboard/indicadores-operacionais-atendente";
import {
  emitirNotificacaoAtendimentoAtribuido,
  emitirNotificacaoMovimentacaoAtendimento,
  emitirNotificacaoRetornoAgendado,
} from "@/lib/notificacoes/service";
import { retornoAgendaAtivo, retornoFoiCancelado, retornoFoiConcluido } from "@/lib/retornos/status";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

function serializarAtendimentoAuditoria(atendimento: Atendimento): string {
  return JSON.stringify({
    unidadeId: atendimento.unidadeId,
    responsavelId: atendimento.responsavelId,
    canal: atendimento.canal,
    respondeu: atendimento.respondeu,
    motivo: atendimento.motivo,
    assunto: atendimento.assunto,
    descricao: atendimento.descricao,
    status: atendimento.status,
    dataProximaAcao: atendimento.dataProximaAcao,
    proximaAcao: atendimento.proximaAcao,
    retornoConcluidoEm: atendimento.retornoConcluidoEm ?? "",
    retornoConcluidoPorId: atendimento.retornoConcluidoPorId ?? null,
    retornoCanceladoEm: atendimento.retornoCanceladoEm ?? "",
    retornoCanceladoPorId: atendimento.retornoCanceladoPorId ?? null,
    retornoCanceladoMotivo: atendimento.retornoCanceladoMotivo ?? "",
  });
}

export class AtendimentoServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detalhes?: string[],
  ) {
    super(message);
  }
}

export type AtendimentoInput = {
  condominioId: number;
  unidadeId: number;
  responsavelId?: number | null;
  canal: string;
  respondeu: string;
  motivo?: string;
  assunto?: string;
  descricao?: string;
  status: string;
  dataProximaAcao?: string;
  proximaAcao?: string;
};

export type AtendimentoFiltros = {
  unidadeId?: number;
  status?: string;
  canal?: string;
  busca?: string;
  operacional?: IndicadorOperacionalAtendenteId;
  de?: string;
  ate?: string;
};

function usuarioVeCarteiraGeral(userId: number) {
  const perm = permissoesDoUsuarioId(userId);
  return temPermissao(perm, "usuarios", "criar");
}

function idsCondominioNoEscopo(userId: number): Set<number> {
  return new Set(escopoCondominios(getCadastros(), userId).map((item) => item.id));
}

function idsUnidadeNoEscopo(userId: number): Set<number> {
  return new Set(escopoUnidades(getCadastros(), userId).map((item) => item.id));
}

function atribuicaoVigente(unidadeId: number): AtribuicaoCobranca | undefined {
  return getCadastros().atribuicoesCobranca.find((item) => item.unidadeId === unidadeId && !item.encerradoEm);
}

function assertUnidadeNoEscopo(userId: number, unidadeId: number, condominioId: number) {
  const unidade = getCadastros().unidades.find((item) => item.id === unidadeId);
  if (!unidade) {
    throw new AtendimentoServiceError("Unidade não encontrada.", 404);
  }
  if (unidade.condominioId !== condominioId) {
    throw new AtendimentoServiceError("A unidade não pertence ao condomínio selecionado.", 400);
  }
  const idsUnidade = idsUnidadeNoEscopo(userId);
  if (!idsUnidade.has(unidadeId)) {
    throw new AtendimentoServiceError("Unidade fora do seu escopo de acesso.", 403);
  }
  const idsCondominio = idsCondominioNoEscopo(userId);
  if (!idsCondominio.has(condominioId)) {
    throw new AtendimentoServiceError("Condomínio fora do seu escopo de acesso.", 403);
  }
  return unidade;
}

function assertCarteiraParaRegistrar(userId: number, unidadeId: number) {
  if (usuarioVeCarteiraGeral(userId)) return;
  const vigente = atribuicaoVigente(unidadeId);
  if (!vigente || vigente.atendenteId !== userId) {
    throw new AtendimentoServiceError(
      "Esta cobrança não está na sua carteira. Peça redistribuição à administradora.",
      403,
    );
  }
}

function validarEntrada(input: AtendimentoInput) {
  if (!Number.isFinite(input.condominioId) || input.condominioId <= 0) {
    throw new AtendimentoServiceError("Selecione o condomínio.", 400);
  }
  if (!Number.isFinite(input.unidadeId) || input.unidadeId <= 0) {
    throw new AtendimentoServiceError("Selecione a unidade.", 400);
  }
  const canal = input.canal.trim();
  if (!canal || !canaisAtendimento.includes(canal as (typeof canaisAtendimento)[number])) {
    throw new AtendimentoServiceError("Canal de atendimento inválido.", 400);
  }
  const respondeu = input.respondeu.trim();
  if (respondeu !== "Sim" && respondeu !== "Não") {
    throw new AtendimentoServiceError("Informe se houve resposta do condômino ou administradora.", 400);
  }
  let motivo = (input.motivo ?? "").trim();
  if (respondeu === "Sim") {
    if (!motivo) {
      throw new AtendimentoServiceError("Selecione o motivo da pendência.", 400);
    }
    if (!motivosPendencia.includes(motivo as (typeof motivosPendencia)[number])) {
      throw new AtendimentoServiceError("Motivo da pendência inválido.", 400);
    }
  } else {
    motivo = "";
  }
  const status = input.status.trim();
  if (!status || !statusAtendimento.includes(status as (typeof statusAtendimento)[number])) {
    throw new AtendimentoServiceError("Situação do atendimento inválida.", 400);
  }

  if (input.responsavelId != null && input.responsavelId > 0) {
    const vinculo = getCadastros().vinculos.some(
      (item) => item.unidadeId === input.unidadeId && item.responsavelId === input.responsavelId,
    );
    if (!vinculo) {
      throw new AtendimentoServiceError("Responsável não vinculado a esta unidade.", 400);
    }
  }

  return {
    canal,
    respondeu,
    motivo,
    status,
    assunto: (input.assunto ?? "").trim(),
    descricao: (input.descricao ?? "").trim(),
    dataProximaAcao: (input.dataProximaAcao ?? "").trim(),
    proximaAcao: (input.proximaAcao ?? "").trim(),
    responsavelId:
      input.responsavelId != null && input.responsavelId > 0 ? String(input.responsavelId) : "",
  };
}

/** Evita duplicata por clique repetido (mesmo usuário, mesma unidade, payload equivalente). */
const ultimosRegistros = new Map<string, number>();
const JANELA_DEDUPE_MS = 4_000;

function chaveDedupe(userId: number, unidadeId: number, dados: ReturnType<typeof validarEntrada>) {
  return `${userId}:${unidadeId}:${dados.canal}:${dados.respondeu}:${dados.motivo}:${dados.status}:${dados.assunto}:${dados.descricao}`;
}

function assertNaoDuplicadoRecente(userId: number, unidadeId: number, dados: ReturnType<typeof validarEntrada>) {
  const chave = chaveDedupe(userId, unidadeId, dados);
  const agora = Date.now();
  const anterior = ultimosRegistros.get(chave);
  if (anterior != null && agora - anterior < JANELA_DEDUPE_MS) {
    throw new AtendimentoServiceError("Registro já salvo. Aguarde um instante antes de tentar de novo.", 409);
  }
  ultimosRegistros.set(chave, agora);
}

export function listarAtendimentos(userId: number, filtros?: AtendimentoFiltros): Atendimento[] {
  if (filtros?.operacional) {
    const periodo =
      filtros.de && filtros.ate ? { inicio: filtros.de, fim: filtros.ate } : undefined;
    return listarAtendimentosIndicadorOperacional(userId, filtros.operacional, periodo);
  }

  const idsUnidade = idsUnidadeNoEscopo(userId);
  const geral = usuarioVeCarteiraGeral(userId);
  let lista = getCadastros().atendimentos.filter((item) => idsUnidade.has(Number(item.unidadeId)));
  if (!geral) {
    lista = lista.filter((item) => item.usuarioId === userId);
  }
  if (filtros?.unidadeId) {
    lista = lista.filter((item) => Number(item.unidadeId) === filtros.unidadeId);
  }
  if (filtros?.status && filtros.status !== "todos") {
    lista = lista.filter((item) => item.status === filtros.status);
  }
  if (filtros?.canal && filtros.canal !== "todos") {
    lista = lista.filter((item) => item.canal === filtros.canal);
  }
  const termo = filtros?.busca?.trim().toLocaleLowerCase("pt-BR");
  if (termo) {
    lista = lista.filter((item) => {
      const texto = `${item.assunto} ${item.descricao} ${item.canal} ${item.motivo}`.toLocaleLowerCase("pt-BR");
      return texto.includes(termo);
    });
  }
  return [...lista].sort((a, b) => b.dataHora.localeCompare(a.dataHora));
}

export function criarAtendimento(
  userId: number,
  input: AtendimentoInput,
  meta?: { ip?: string; userAgent?: string },
): Atendimento {
  const dados = validarEntrada(input);
  assertUnidadeNoEscopo(userId, input.unidadeId, input.condominioId);
  assertCarteiraParaRegistrar(userId, input.unidadeId);
  assertNaoDuplicadoRecente(userId, input.unidadeId, dados);

  const registro: Atendimento = {
    id: crypto.randomUUID(),
    unidadeId: String(input.unidadeId),
    responsavelId: dados.responsavelId,
    usuarioId: userId,
    dataHora: agoraIso(),
    canal: dados.canal,
    respondeu: dados.respondeu,
    motivo: dados.motivo,
    assunto: dados.assunto,
    descricao: dados.descricao,
    status: dados.status,
    dataProximaAcao: dados.dataProximaAcao,
    proximaAcao: dados.proximaAcao,
    retornoConcluidoEm: "",
    retornoConcluidoPorId: null,
    retornoCanceladoEm: "",
    retornoCanceladoPorId: null,
    retornoCanceladoMotivo: "",
  };

  setAtendimentos((current) => [...current, registro]);
  registrarAuditoria(
    {
      entidade: "service_ticket",
      registroId: registro.id,
      acao: "INSERT",
      dadosAnteriores: "",
      dadosNovos: serializarAtendimentoAuditoria(registro),
      camposAlterados: "unidade_id, canal, status, respondeu",
    },
    userId,
    meta,
  );
  emitirNotificacaoRetornoAgendado(registro);
  emitirNotificacaoAtendimentoAtribuido(registro, userId);
  return registro;
}

export function atualizarAtendimento(
  userId: number,
  id: string,
  input: AtendimentoInput,
  meta?: { ip?: string; userAgent?: string },
): Atendimento {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "atendimentos", "editar")) {
    throw new AtendimentoServiceError("Sem permissão para editar atendimentos.", 403);
  }

  const anterior = getCadastros().atendimentos.find((item) => item.id === id);
  if (!anterior) {
    throw new AtendimentoServiceError("Atendimento não encontrado.", 404);
  }

  const dados = validarEntrada(input);
  assertUnidadeNoEscopo(userId, input.unidadeId, input.condominioId);
  if (!usuarioVeCarteiraGeral(userId) && anterior.usuarioId !== userId) {
    throw new AtendimentoServiceError("Só a administradora pode corrigir atendimento de outro colaborador.", 403);
  }

  const atualizado: Atendimento = {
    ...anterior,
    unidadeId: String(input.unidadeId),
    responsavelId: dados.responsavelId,
    canal: dados.canal,
    respondeu: dados.respondeu,
    motivo: dados.motivo,
    assunto: dados.assunto,
    descricao: dados.descricao,
    status: dados.status,
    dataProximaAcao: dados.dataProximaAcao,
    proximaAcao: dados.proximaAcao,
    retornoConcluidoEm: anterior.retornoConcluidoEm ?? "",
    retornoConcluidoPorId: anterior.retornoConcluidoPorId ?? null,
    retornoCanceladoEm: anterior.retornoCanceladoEm ?? "",
    retornoCanceladoPorId: anterior.retornoCanceladoPorId ?? null,
    retornoCanceladoMotivo: anterior.retornoCanceladoMotivo ?? "",
  };

  setAtendimentos((current) => current.map((item) => (item.id === id ? atualizado : item)));
  registrarAuditoria(
    {
      entidade: "service_ticket",
      registroId: id,
      acao: "UPDATE",
      dadosAnteriores: serializarAtendimentoAuditoria(anterior),
      dadosNovos: serializarAtendimentoAuditoria(atualizado),
      camposAlterados: "unidade_id, canal, status, descricao, retorno",
    },
    userId,
    meta,
  );
  if (
    atualizado.dataProximaAcao.trim() &&
    (anterior.dataProximaAcao !== atualizado.dataProximaAcao || !anterior.dataProximaAcao.trim())
  ) {
    emitirNotificacaoRetornoAgendado(atualizado);
  }
  emitirNotificacaoMovimentacaoAtendimento(atualizado, anterior, userId);
  return atualizado;
}

export function excluirAtendimento(userId: number, id: string, meta?: { ip?: string; userAgent?: string }) {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "atendimentos", "excluir")) {
    throw new AtendimentoServiceError("Sem permissão para excluir atendimentos.", 403);
  }

  const alvo = getCadastros().atendimentos.find((item) => item.id === id);
  if (!alvo) {
    throw new AtendimentoServiceError("Atendimento não encontrado.", 404);
  }

  const unidadeId = Number(alvo.unidadeId);
  if (idsUnidadeNoEscopo(userId).has(unidadeId)) {
    /* ok */
  } else {
    throw new AtendimentoServiceError("Atendimento fora do seu escopo de acesso.", 403);
  }

  setAtendimentos((current) => current.filter((item) => item.id !== id));
  registrarAuditoria(
    {
      entidade: "service_ticket",
      registroId: id,
      acao: "DELETE",
      dadosAnteriores: alvo.assunto || alvo.canal,
      dadosNovos: "",
      camposAlterados: "registro",
    },
    userId,
    meta,
  );
}

export type RetornoAgendamentoInput = {
  dataProximaAcao: string;
  proximaAcao?: string;
  descricao?: string;
};

function normalizarDataRetorno(valor: string) {
  const texto = valor.trim();
  if (!texto) {
    throw new AtendimentoServiceError("Informe a data do retorno.", 400);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return `${texto}T00:00:00`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(texto)) return `${texto}:00`;
  return texto;
}

function assertAtendimentoComRetornoEditavel(userId: number, id: string) {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "atendimentos", "editar")) {
    throw new AtendimentoServiceError("Sem permissão para alterar retornos.", 403);
  }

  const anterior = getCadastros().atendimentos.find((item) => item.id === id);
  if (!anterior) {
    throw new AtendimentoServiceError("Atendimento não encontrado.", 404);
  }
  if (!anterior.dataProximaAcao.trim()) {
    throw new AtendimentoServiceError("Este atendimento não possui retorno agendado.", 400);
  }
  if (retornoFoiConcluido(anterior)) {
    throw new AtendimentoServiceError("Retorno já foi marcado como realizado.", 409);
  }
  if (retornoFoiCancelado(anterior)) {
    throw new AtendimentoServiceError("Retorno cancelado não pode ser alterado.", 409);
  }

  const unidadeId = Number(anterior.unidadeId);
  if (!idsUnidadeNoEscopo(userId).has(unidadeId)) {
    throw new AtendimentoServiceError("Atendimento fora do seu escopo de acesso.", 403);
  }
  assertCarteiraParaRegistrar(userId, unidadeId);
  return anterior;
}

export function obterAtendimentoNoEscopo(userId: number, id: string): Atendimento {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "atendimentos", "ler")) {
    throw new AtendimentoServiceError("Sem permissão para consultar atendimentos.", 403);
  }
  const item = getCadastros().atendimentos.find((a) => a.id === id);
  if (!item) {
    throw new AtendimentoServiceError("Atendimento não encontrado.", 404);
  }
  const unidadeId = Number(item.unidadeId);
  if (!idsUnidadeNoEscopo(userId).has(unidadeId)) {
    throw new AtendimentoServiceError("Atendimento fora do seu escopo de acesso.", 403);
  }
  if (!usuarioVeCarteiraGeral(userId)) {
    const vigente = atribuicaoVigente(unidadeId);
    if (!vigente || vigente.atendenteId !== userId) {
      throw new AtendimentoServiceError("Atendimento fora da sua carteira vigente.", 403);
    }
  }
  return item;
}

export function agendarRetornoEmAtendimento(
  userId: number,
  id: string,
  input: RetornoAgendamentoInput,
  meta?: { ip?: string; userAgent?: string },
): Atendimento {
  const anterior = getCadastros().atendimentos.find((item) => item.id === id);
  if (!anterior) {
    throw new AtendimentoServiceError("Atendimento não encontrado.", 404);
  }
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "atendimentos", "editar")) {
    throw new AtendimentoServiceError("Sem permissão para agendar retorno.", 403);
  }
  const unidadeId = Number(anterior.unidadeId);
  if (!idsUnidadeNoEscopo(userId).has(unidadeId)) {
    throw new AtendimentoServiceError("Atendimento fora do seu escopo de acesso.", 403);
  }
  assertCarteiraParaRegistrar(userId, unidadeId);

  if (retornoAgendaAtivo(anterior)) {
    throw new AtendimentoServiceError("Já existe um retorno pendente neste atendimento. Reprograme ou cancele o atual.", 409);
  }

  const dataProximaAcao = normalizarDataRetorno(input.dataProximaAcao);
  const proximaAcao = input.proximaAcao?.trim() ?? "";
  if (!proximaAcao) {
    throw new AtendimentoServiceError("Informe a descrição do retorno.", 400);
  }

  const atualizado: Atendimento = {
    ...anterior,
    dataProximaAcao,
    proximaAcao,
    descricao: input.descricao?.trim() ?? anterior.descricao,
    retornoConcluidoEm: "",
    retornoConcluidoPorId: null,
    retornoCanceladoEm: "",
    retornoCanceladoPorId: null,
    retornoCanceladoMotivo: "",
  };

  setAtendimentos((current) => current.map((item) => (item.id === id ? atualizado : item)));
  registrarAuditoria(
    {
      entidade: "service_ticket",
      registroId: id,
      acao: "UPDATE",
      dadosAnteriores: serializarAtendimentoAuditoria(anterior),
      dadosNovos: serializarAtendimentoAuditoria(atualizado),
      camposAlterados: "retorno_agendado",
    },
    userId,
    meta,
  );
  emitirNotificacaoRetornoAgendado(atualizado);
  return atualizado;
}

export function atualizarRetornoAgendado(
  userId: number,
  id: string,
  input: RetornoAgendamentoInput,
  meta?: { ip?: string; userAgent?: string },
): Atendimento {
  const anterior = assertAtendimentoComRetornoEditavel(userId, id);
  const dataProximaAcao = input.dataProximaAcao.trim()
    ? normalizarDataRetorno(input.dataProximaAcao)
    : anterior.dataProximaAcao;
  const proximaAcao = input.proximaAcao?.trim() ? input.proximaAcao.trim() : anterior.proximaAcao;

  const atualizado: Atendimento = {
    ...anterior,
    dataProximaAcao,
    proximaAcao,
    descricao: input.descricao !== undefined ? input.descricao.trim() : anterior.descricao,
  };

  setAtendimentos((current) => current.map((item) => (item.id === id ? atualizado : item)));
  registrarAuditoria(
    {
      entidade: "service_ticket",
      registroId: id,
      acao: "UPDATE",
      dadosAnteriores: JSON.stringify({
        dataProximaAcao: anterior.dataProximaAcao,
        proximaAcao: anterior.proximaAcao,
        descricao: anterior.descricao,
      }),
      dadosNovos: JSON.stringify({
        dataProximaAcao: atualizado.dataProximaAcao,
        proximaAcao: atualizado.proximaAcao,
        descricao: atualizado.descricao,
      }),
      camposAlterados: "retorno_atualizado",
    },
    userId,
    meta,
  );
  if (anterior.dataProximaAcao !== atualizado.dataProximaAcao) {
    emitirNotificacaoRetornoAgendado(atualizado);
  }
  return atualizado;
}

export function reprogramarRetornoAgendado(
  userId: number,
  id: string,
  input: RetornoAgendamentoInput,
  meta?: { ip?: string; userAgent?: string },
): Atendimento {
  const anterior = assertAtendimentoComRetornoEditavel(userId, id);
  const dataProximaAcao = normalizarDataRetorno(input.dataProximaAcao);
  const proximaAcao = input.proximaAcao?.trim() ? input.proximaAcao.trim() : anterior.proximaAcao;
  if (!proximaAcao) {
    throw new AtendimentoServiceError("Informe a descrição do retorno.", 400);
  }

  const atualizado: Atendimento = {
    ...anterior,
    dataProximaAcao,
    proximaAcao,
    descricao: input.descricao !== undefined ? input.descricao.trim() : anterior.descricao,
  };

  setAtendimentos((current) => current.map((item) => (item.id === id ? atualizado : item)));
  registrarAuditoria(
    {
      entidade: "service_ticket",
      registroId: id,
      acao: "UPDATE",
      dadosAnteriores: JSON.stringify({
        dataProximaAcao: anterior.dataProximaAcao,
        proximaAcao: anterior.proximaAcao,
        descricao: anterior.descricao,
      }),
      dadosNovos: JSON.stringify({
        dataProximaAcao: atualizado.dataProximaAcao,
        proximaAcao: atualizado.proximaAcao,
        descricao: atualizado.descricao,
      }),
      camposAlterados: "reprogramacao_retorno",
    },
    userId,
    meta,
  );
  emitirNotificacaoRetornoAgendado(atualizado);
  return atualizado;
}

export function cancelarRetornoAgendado(
  userId: number,
  id: string,
  justificativa: string,
  meta?: { ip?: string; userAgent?: string },
): Atendimento {
  const anterior = assertAtendimentoComRetornoEditavel(userId, id);
  const motivo = justificativa.trim();
  if (!motivo) {
    throw new AtendimentoServiceError("Informe a justificativa do cancelamento.", 400);
  }

  const atualizado: Atendimento = {
    ...anterior,
    retornoCanceladoEm: agoraIso(),
    retornoCanceladoPorId: userId,
    retornoCanceladoMotivo: motivo,
  };

  setAtendimentos((current) => current.map((item) => (item.id === id ? atualizado : item)));
  registrarAuditoria(
    {
      entidade: "service_ticket",
      registroId: id,
      acao: "UPDATE",
      dadosAnteriores: JSON.stringify({
        dataProximaAcao: anterior.dataProximaAcao,
        proximaAcao: anterior.proximaAcao,
        retornoCanceladoEm: "",
      }),
      dadosNovos: JSON.stringify({
        dataProximaAcao: atualizado.dataProximaAcao,
        proximaAcao: atualizado.proximaAcao,
        retornoCanceladoEm: atualizado.retornoCanceladoEm,
        retornoCanceladoMotivo: atualizado.retornoCanceladoMotivo,
      }),
      camposAlterados: "retorno_cancelado",
    },
    userId,
    meta,
  );
  return atualizado;
}

export function concluirRetornoAgendado(
  userId: number,
  id: string,
  meta?: { ip?: string; userAgent?: string },
): Atendimento {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "atendimentos", "editar")) {
    throw new AtendimentoServiceError("Sem permissão para concluir retornos.", 403);
  }

  const anterior = getCadastros().atendimentos.find((item) => item.id === id);
  if (!anterior) {
    throw new AtendimentoServiceError("Atendimento não encontrado.", 404);
  }
  if (!anterior.dataProximaAcao.trim()) {
    throw new AtendimentoServiceError("Este atendimento não possui retorno agendado.", 400);
  }
  if (anterior.retornoConcluidoEm?.trim()) {
    throw new AtendimentoServiceError("Retorno já foi marcado como realizado.", 409);
  }

  const unidadeId = Number(anterior.unidadeId);
  const unidade = getCadastros().unidades.find((item) => item.id === unidadeId);
  if (!unidade) {
    throw new AtendimentoServiceError("Unidade não encontrada.", 404);
  }
  if (!idsUnidadeNoEscopo(userId).has(unidadeId)) {
    throw new AtendimentoServiceError("Atendimento fora do seu escopo de acesso.", 403);
  }
  assertCarteiraParaRegistrar(userId, unidadeId);

  const atualizado: Atendimento = {
    ...anterior,
    retornoConcluidoEm: agoraIso(),
    retornoConcluidoPorId: userId,
  };

  setAtendimentos((current) => current.map((item) => (item.id === id ? atualizado : item)));
  registrarAuditoria(
    {
      entidade: "service_ticket",
      registroId: id,
      acao: "UPDATE",
      dadosAnteriores: JSON.stringify({ retornoConcluidoEm: "" }),
      dadosNovos: JSON.stringify({
        retornoConcluidoEm: atualizado.retornoConcluidoEm,
        retornoConcluidoPorId: atualizado.retornoConcluidoPorId,
        dataProximaAcao: atualizado.dataProximaAcao,
      }),
      camposAlterados: "retorno_concluido_em, retorno_concluido_por_id",
    },
    userId,
    meta,
  );
  return atualizado;
}

export function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}
