import {
  agoraIso,
  escopoCondominios,
  escopoUnidades,
  formatarData,
  getCadastros,
  nomeUnidade,
  proximoNumero,
  setNotificacaoFalhas,
  setNotificacoesInternas,
  situacaoRetorno,
  type Atendimento,
  type AtribuicaoCobranca,
  type NotificacaoFalha,
  type NotificacaoInterna,
} from "@/data/catalogo";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";
import { dataHoraPartesEmFuso, hojeEmFuso, minutosDesdeMeiaNoite, FUSO_NOTIFICACOES } from "@/lib/notificacoes/timezone";

export class NotificacaoServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Canais externos permanecem desativados até aprovação de provedor (T34). */
export const CANAIS_EXTERNOS_HABILITADOS = {
  whatsapp: false,
  sms: false,
  email: false,
} as const;

export type EventoNotificacaoInterna = NotificacaoInterna["evento"];

export type PreferenciasNotificacaoUsuario = {
  lembreteRetornoHoje: boolean;
  /** HH:mm no fuso America/Sao_Paulo */
  horarioLembrete: string;
};

const preferenciasPorUsuario = new Map<number, PreferenciasNotificacaoUsuario>();

const preferenciasPadrao: PreferenciasNotificacaoUsuario = {
  lembreteRetornoHoje: true,
  horarioLembrete: "08:00",
};

/** Somente testes — simula falha ao persistir notificação. */
let simularFalhaPersistencia = false;

export function setSimularFalhaNotificacao(ativo: boolean) {
  simularFalhaPersistencia = ativo;
}

export function resetPreferenciasNotificacaoTestes() {
  preferenciasPorUsuario.clear();
  simularFalhaPersistencia = false;
}

export function obterPreferenciasNotificacao(userId: number): PreferenciasNotificacaoUsuario {
  return { ...(preferenciasPorUsuario.get(userId) ?? preferenciasPadrao) };
}

export function atualizarPreferenciasNotificacao(
  userId: number,
  patch: Partial<PreferenciasNotificacaoUsuario>,
): PreferenciasNotificacaoUsuario {
  const atual = obterPreferenciasNotificacao(userId);
  const next = { ...atual, ...patch };
  preferenciasPorUsuario.set(userId, next);
  return next;
}

function assertPodeConsultarNotificacoes(userId: number) {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "dashboard", "ler")) {
    throw new NotificacaoServiceError("Sem permissão para consultar notificações.", 403);
  }
}

function destinatarioPodeReceber(userId: number) {
  const perm = permissoesDoUsuarioId(userId);
  return temPermissao(perm, "atendimentos", "ler");
}

function atribuicaoVigente(unidadeId: number): AtribuicaoCobranca | undefined {
  return getCadastros().atribuicoesCobranca.find((item) => item.unidadeId === unidadeId && !item.encerradoEm);
}

function destinatarioRetornoAgendado(atendimento: Atendimento): number | null {
  const unidadeId = Number(atendimento.unidadeId);
  const vigente = atribuicaoVigente(unidadeId);
  if (vigente?.atendenteId) return vigente.atendenteId;
  return atendimento.usuarioId;
}

function registrarFalha(entry: Omit<NotificacaoFalha, "id" | "ocorridoEm">) {
  const falhas = getCadastros().notificacaoFalhas;
  const registro: NotificacaoFalha = {
    id: proximoNumero(falhas.map((item) => item.id)),
    ocorridoEm: agoraIso(),
    ...entry,
  };
  setNotificacaoFalhas([registro, ...falhas]);
}

function criarNotificacao(input: Omit<NotificacaoInterna, "id" | "criadoEm" | "lidaEm">): NotificacaoInterna | null {
  if (!destinatarioPodeReceber(input.destinatarioId)) {
    return null;
  }

  const existente = getCadastros().notificacoesInternas.find((item) => item.chaveIdempotencia === input.chaveIdempotencia);
  if (existente) return existente;

  if (simularFalhaPersistencia) {
    registrarFalha({
      chaveIdempotencia: input.chaveIdempotencia,
      evento: input.evento,
      destinatarioId: input.destinatarioId,
      erro: "Falha simulada do serviço de notificação.",
    });
    return null;
  }

  try {
    const lista = getCadastros().notificacoesInternas;
    const registro: NotificacaoInterna = {
      id: proximoNumero(lista.map((item) => item.id)),
      criadoEm: agoraIso(),
      lidaEm: null,
      ...input,
    };
    setNotificacoesInternas([registro, ...lista]);
    return registro;
  } catch (error) {
    registrarFalha({
      chaveIdempotencia: input.chaveIdempotencia,
      evento: input.evento,
      destinatarioId: input.destinatarioId,
      erro: error instanceof Error ? error.message : "Erro desconhecido ao gravar notificação.",
    });
    return null;
  }
}

export function emitirNotificacaoRetornoAgendado(atendimento: Atendimento): NotificacaoInterna | null {
  if (!atendimento.dataProximaAcao.trim() || atendimento.retornoConcluidoEm?.trim()) return null;
  const destinatarioId = destinatarioRetornoAgendado(atendimento);
  if (!destinatarioId) return null;

  const unidadeId = Number(atendimento.unidadeId);
  const dataRef = atendimento.dataProximaAcao.slice(0, 10);
  const chaveIdempotencia = `retorno_agendado:${atendimento.id}:${destinatarioId}:${dataRef}`;

  return criarNotificacao({
    chaveIdempotencia,
    evento: "retorno_agendado",
    destinatarioId,
    titulo: "Retorno agendado",
    descricao: `${nomeUnidade(unidadeId)} · previsto para ${formatarData(atendimento.dataProximaAcao)}`,
    entidadeTipo: "service_ticket",
    registroId: atendimento.id,
    unidadeId,
    condominioId: getCadastros().unidades.find((u) => u.id === unidadeId)?.condominioId ?? null,
  });
}

export function emitirNotificacaoCobrancaAtribuida(atribuicao: AtribuicaoCobranca): NotificacaoInterna | null {
  const destinatarioId = atribuicao.atendenteId;
  const chaveIdempotencia = `cobranca_atribuida:${atribuicao.id}:${destinatarioId}`;

  return criarNotificacao({
    chaveIdempotencia,
    evento: "cobranca_atribuida",
    destinatarioId,
    titulo: "Cobrança atribuída à sua carteira",
    descricao: `${nomeUnidade(atribuicao.unidadeId)} · ${atribuicao.motivo || "Nova atribuição"}`,
    entidadeTipo: "collection_assignment",
    registroId: String(atribuicao.id),
    unidadeId: atribuicao.unidadeId,
    condominioId: getCadastros().unidades.find((u) => u.id === atribuicao.unidadeId)?.condominioId ?? null,
  });
}

/** Reprocessa lembrete diário de retornos para hoje (idempotente por dia). */
export function processarLembretesRetornoHoje(referenciaIso = agoraIso()) {
  const hoje = hojeEmFuso();
  const cadastros = getCadastros();

  for (const atendimento of cadastros.atendimentos) {
    if (!atendimento.dataProximaAcao.trim() || atendimento.retornoConcluidoEm?.trim()) continue;
    if (situacaoRetorno(atendimento.dataProximaAcao, hoje) !== "hoje") continue;

    const destinatarioId = destinatarioRetornoAgendado(atendimento);
    if (!destinatarioId) continue;

    const prefs = obterPreferenciasNotificacao(destinatarioId);
    if (!prefs.lembreteRetornoHoje) continue;

    const partes = dataHoraPartesEmFuso(referenciaIso);
    if (!partes) continue;
    const limite = minutosDesdeMeiaNoite(prefs.horarioLembrete);
    if (minutosDesdeMeiaNoite(partes.hora) < limite) continue;

    const unidadeId = Number(atendimento.unidadeId);
    const chaveIdempotencia = `retorno_lembrete_hoje:${atendimento.id}:${destinatarioId}:${hoje}`;

    criarNotificacao({
      chaveIdempotencia,
      evento: "retorno_lembrete_hoje",
      destinatarioId,
      titulo: "Retorno previsto para hoje",
      descricao: `${nomeUnidade(unidadeId)} · ${atendimento.proximaAcao || "Retorno pendente"}`,
      entidadeTipo: "service_ticket",
      registroId: atendimento.id,
      unidadeId,
      condominioId: cadastros.unidades.find((u) => u.id === unidadeId)?.condominioId ?? null,
    });
  }
}

export type NotificacaoApresentacao = NotificacaoInterna & {
  urlRegistro: string | null;
  relativo: string;
};

function formatarRelativo(iso: string) {
  const instant = Date.parse(iso);
  if (Number.isNaN(instant)) return "";
  const diffMin = Math.floor((Date.now() - instant) / 60_000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;
  const diffD = Math.floor(diffH / 24);
  return `há ${diffD} d`;
}

export function resolverUrlRegistroNotificacao(item: NotificacaoInterna): string | null {
  if (item.entidadeTipo === "service_ticket") {
    return `/atendimentos?retorno=todos&atendimento=${encodeURIComponent(item.registroId)}`;
  }
  if (item.entidadeTipo === "collection_assignment") {
    return `/atendimentos?unidade=${item.unidadeId}`;
  }
  return null;
}

function usuarioAcessaRegistro(userId: number, item: NotificacaoInterna): boolean {
  const cadastros = getCadastros();
  const idsCondominio = new Set(escopoCondominios(cadastros, userId).map((c) => c.id));
  const unidade = cadastros.unidades.find((u) => u.id === item.unidadeId);
  if (!unidade || !idsCondominio.has(unidade.condominioId)) return false;

  const perm = permissoesDoUsuarioId(userId);
  const veCarteiraGeral = temPermissao(perm, "usuarios", "criar");
  if (veCarteiraGeral) return true;

  const idsUnidade = new Set(escopoUnidades(cadastros, userId).map((u) => u.id));
  if (!idsUnidade.has(item.unidadeId)) return false;

  if (item.entidadeTipo === "service_ticket") {
    const atendimento = cadastros.atendimentos.find((a) => a.id === item.registroId);
    if (!atendimento) return false;
    const vigente = atribuicaoVigente(item.unidadeId);
    if (vigente && vigente.atendenteId === userId) return true;
    return atendimento.usuarioId === userId;
  }

  if (item.entidadeTipo === "collection_assignment") {
    const vigente = atribuicaoVigente(item.unidadeId);
    return vigente?.atendenteId === userId;
  }

  return false;
}

function montarApresentacao(item: NotificacaoInterna): NotificacaoApresentacao {
  return {
    ...item,
    urlRegistro: resolverUrlRegistroNotificacao(item),
    relativo: formatarRelativo(item.criadoEm),
  };
}

export function listarNotificacoes(
  userId: number,
  opcoes?: { limit?: number; apenasNaoLidas?: boolean },
): NotificacaoApresentacao[] {
  assertPodeConsultarNotificacoes(userId);
  processarLembretesRetornoHoje();

  const limit = Math.min(100, Math.max(1, opcoes?.limit ?? 20));
  let lista = getCadastros().notificacoesInternas.filter((item) => item.destinatarioId === userId);
  if (opcoes?.apenasNaoLidas) {
    lista = lista.filter((item) => !item.lidaEm);
  }
  return lista
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    .slice(0, limit)
    .map(montarApresentacao);
}

export function contarNotificacoesNaoLidas(userId: number) {
  assertPodeConsultarNotificacoes(userId);
  processarLembretesRetornoHoje();
  return getCadastros().notificacoesInternas.filter((item) => item.destinatarioId === userId && !item.lidaEm).length;
}

export function marcarNotificacaoLida(userId: number, id: number): NotificacaoApresentacao {
  assertPodeConsultarNotificacoes(userId);
  const alvo = getCadastros().notificacoesInternas.find((item) => item.id === id);
  if (!alvo || alvo.destinatarioId !== userId) {
    throw new NotificacaoServiceError("Notificação não encontrada.", 404);
  }
  if (alvo.lidaEm) return montarApresentacao(alvo);

  const atualizado: NotificacaoInterna = { ...alvo, lidaEm: agoraIso() };
  setNotificacoesInternas((current) => current.map((item) => (item.id === id ? atualizado : item)));
  return montarApresentacao(atualizado);
}

export function marcarTodasNotificacoesLidas(userId: number) {
  assertPodeConsultarNotificacoes(userId);
  const agora = agoraIso();
  setNotificacoesInternas((current) =>
    current.map((item) =>
      item.destinatarioId === userId && !item.lidaEm ? { ...item, lidaEm: agora } : item,
    ),
  );
  return contarNotificacoesNaoLidas(userId);
}

export function obterNotificacaoParaAbrir(userId: number, id: number): NotificacaoApresentacao {
  assertPodeConsultarNotificacoes(userId);
  const alvo = getCadastros().notificacoesInternas.find((item) => item.id === id);
  if (!alvo || alvo.destinatarioId !== userId) {
    throw new NotificacaoServiceError("Notificação não encontrada.", 404);
  }
  if (!usuarioAcessaRegistro(userId, alvo)) {
    throw new NotificacaoServiceError("Registro relacionado fora do seu escopo.", 403);
  }
  return montarApresentacao(alvo);
}

/** Reprocessa evento (testes de idempotência). */
export function reprocessarEventoRetornoAgendado(atendimentoId: string): NotificacaoInterna | null {
  const atendimento = getCadastros().atendimentos.find((item) => item.id === atendimentoId);
  if (!atendimento) return null;
  return emitirNotificacaoRetornoAgendado(atendimento);
}

export function fusoOperacionalNotificacoes() {
  return FUSO_NOTIFICACOES;
}
