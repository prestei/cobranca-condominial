import { agoraIso, escopoCondominios, escopoUnidades, formatarData, situacaoRetorno, type Atendimento, type AtribuicaoCobranca, type Cadastros, type NotificacaoFalha, type NotificacaoInterna } from "@/data/catalogo";
import { loadFullOperationalCadastros } from "@/lib/db/cadastros-scope";
import { findCondominiumById } from "@/lib/db/repositories/condominium-repository";
import {
  createInternalNotification,
  findInternalNotificationById,
  findInternalNotificationByIdempotencyKey,
  listInternalNotificationsByRecipient,
  nextInternalNotificationId,
  nextNotificationFailureId,
  prependNotificationFailure,
  updateInternalNotification,
} from "@/lib/db/repositories/notification-repository";
import { findUnitById } from "@/lib/db/repositories/unit-repository";
import { openAssignmentForUnit } from "@/lib/db/service-context";
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

async function destinatarioRetornoAgendado(atendimento: Atendimento): Promise<number | null> {
  const unidadeId = Number(atendimento.unidadeId);
  const vigente = await openAssignmentForUnit(unidadeId);
  if (vigente?.atendenteId) return vigente.atendenteId;
  return atendimento.usuarioId;
}

async function registrarFalha(entry: Omit<NotificacaoFalha, "id" | "ocorridoEm">) {
  const registro: NotificacaoFalha = {
    id: await nextNotificationFailureId(),
    ocorridoEm: agoraIso(),
    ...entry,
  };
  await prependNotificationFailure(registro);
}

async function rotuloUnidade(unidadeId: number): Promise<string> {
  const unidade = await findUnitById(unidadeId);
  if (!unidade) return "—";
  const condominio = await findCondominiumById(unidade.condominioId);
  const nomeCondo = condominio?.nome ?? "—";
  return `${nomeCondo} · ${unidade.identificacao}`;
}

async function criarNotificacao(input: Omit<NotificacaoInterna, "id" | "criadoEm" | "lidaEm">): Promise<NotificacaoInterna | null> {
  if (!destinatarioPodeReceber(input.destinatarioId)) {
    return null;
  }

  const existente = await findInternalNotificationByIdempotencyKey(input.chaveIdempotencia);
  if (existente) return existente;

  if (simularFalhaPersistencia) {
    await registrarFalha({
      chaveIdempotencia: input.chaveIdempotencia,
      evento: input.evento,
      destinatarioId: input.destinatarioId,
      erro: "Falha simulada do serviço de notificação.",
    });
    return null;
  }

  try {
    const registro: NotificacaoInterna = {
      id: await nextInternalNotificationId(),
      criadoEm: agoraIso(),
      lidaEm: null,
      ...input,
    };
    return await createInternalNotification(registro);
  } catch (error) {
    await registrarFalha({
      chaveIdempotencia: input.chaveIdempotencia,
      evento: input.evento,
      destinatarioId: input.destinatarioId,
      erro: error instanceof Error ? error.message : "Erro desconhecido ao gravar notificação.",
    });
    return null;
  }
}

export async function emitirNotificacaoRetornoAgendado(atendimento: Atendimento): Promise<NotificacaoInterna | null> {
  if (!atendimento.dataProximaAcao.trim() || atendimento.retornoConcluidoEm?.trim()) return null;
  const destinatarioId = await destinatarioRetornoAgendado(atendimento);
  if (!destinatarioId) return null;

  const unidadeId = Number(atendimento.unidadeId);
  const dataRef = atendimento.dataProximaAcao.slice(0, 10);
  const chaveIdempotencia = `retorno_agendado:${atendimento.id}:${destinatarioId}:${dataRef}`;
  const unidade = await findUnitById(unidadeId);

  return criarNotificacao({
    chaveIdempotencia,
    evento: "retorno_agendado",
    destinatarioId,
    titulo: "Retorno agendado",
    descricao: `${await rotuloUnidade(unidadeId)} · previsto para ${formatarData(atendimento.dataProximaAcao)}`,
    entidadeTipo: "service_ticket",
    registroId: atendimento.id,
    unidadeId,
    condominioId: unidade?.condominioId ?? null,
  });
}

export async function emitirNotificacaoCobrancaAtribuida(atribuicao: AtribuicaoCobranca): Promise<NotificacaoInterna | null> {
  const destinatarioId = atribuicao.atendenteId;
  const chaveIdempotencia = `cobranca_atribuida:${atribuicao.id}:${destinatarioId}`;
  const unidade = await findUnitById(atribuicao.unidadeId);

  return criarNotificacao({
    chaveIdempotencia,
    evento: "cobranca_atribuida",
    destinatarioId,
    titulo: "Cobrança atribuída à sua carteira",
    descricao: `${await rotuloUnidade(atribuicao.unidadeId)} · ${atribuicao.motivo || "Nova atribuição"}`,
    entidadeTipo: "collection_assignment",
    registroId: String(atribuicao.id),
    unidadeId: atribuicao.unidadeId,
    condominioId: unidade?.condominioId ?? null,
  });
}

/** Reprocessa lembrete diário de retornos para hoje (idempotente por dia). */
export async function processarLembretesRetornoHoje(referenciaIso = agoraIso()) {
  const hoje = hojeEmFuso();
  const cadastros = await loadFullOperationalCadastros();

  for (const atendimento of cadastros.atendimentos) {
    if (!atendimento.dataProximaAcao.trim() || atendimento.retornoConcluidoEm?.trim()) continue;
    if (situacaoRetorno(atendimento.dataProximaAcao, hoje) !== "hoje") continue;

    const destinatarioId = await destinatarioRetornoAgendado(atendimento);
    if (!destinatarioId) continue;

    const prefs = obterPreferenciasNotificacao(destinatarioId);
    if (!prefs.lembreteRetornoHoje) continue;

    const partes = dataHoraPartesEmFuso(referenciaIso);
    if (!partes) continue;
    const limite = minutosDesdeMeiaNoite(prefs.horarioLembrete);
    if (minutosDesdeMeiaNoite(partes.hora) < limite) continue;

    const unidadeId = Number(atendimento.unidadeId);
    const unidade = cadastros.unidades.find((u) => u.id === unidadeId);
    const chaveIdempotencia = `retorno_lembrete_hoje:${atendimento.id}:${destinatarioId}:${hoje}`;

    await criarNotificacao({
      chaveIdempotencia,
      evento: "retorno_lembrete_hoje",
      destinatarioId,
      titulo: "Retorno previsto para hoje",
      descricao: `${await rotuloUnidade(unidadeId)} · ${atendimento.proximaAcao || "Retorno pendente"}`,
      entidadeTipo: "service_ticket",
      registroId: atendimento.id,
      unidadeId,
      condominioId: unidade?.condominioId ?? null,
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

async function usuarioAcessaRegistro(userId: number, item: NotificacaoInterna, cadastros: Cadastros): Promise<boolean> {
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
    const vigente = await openAssignmentForUnit(item.unidadeId);
    if (vigente && vigente.atendenteId === userId) return true;
    return atendimento.usuarioId === userId;
  }

  if (item.entidadeTipo === "collection_assignment") {
    const vigente = await openAssignmentForUnit(item.unidadeId);
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

export async function listarNotificacoes(
  userId: number,
  opcoes?: { limit?: number; apenasNaoLidas?: boolean },
): Promise<NotificacaoApresentacao[]> {
  assertPodeConsultarNotificacoes(userId);
  await processarLembretesRetornoHoje();

  const limit = Math.min(100, Math.max(1, opcoes?.limit ?? 20));
  let lista = await listInternalNotificationsByRecipient(userId);
  if (opcoes?.apenasNaoLidas) {
    lista = lista.filter((item) => !item.lidaEm);
  }
  return lista
    .sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))
    .slice(0, limit)
    .map(montarApresentacao);
}

export async function contarNotificacoesNaoLidas(userId: number) {
  assertPodeConsultarNotificacoes(userId);
  await processarLembretesRetornoHoje();
  const lista = await listInternalNotificationsByRecipient(userId);
  return lista.filter((item) => !item.lidaEm).length;
}

export async function marcarNotificacaoLida(userId: number, id: number): Promise<NotificacaoApresentacao> {
  assertPodeConsultarNotificacoes(userId);
  const alvo = await findInternalNotificationById(id);
  if (!alvo || alvo.destinatarioId !== userId) {
    throw new NotificacaoServiceError("Notificação não encontrada.", 404);
  }
  if (alvo.lidaEm) return montarApresentacao(alvo);

  const atualizado: NotificacaoInterna = { ...alvo, lidaEm: agoraIso() };
  const salvo = await updateInternalNotification(atualizado);
  return montarApresentacao(salvo);
}

export async function marcarTodasNotificacoesLidas(userId: number) {
  assertPodeConsultarNotificacoes(userId);
  const agora = agoraIso();
  const lista = await listInternalNotificationsByRecipient(userId);
  for (const item of lista) {
    if (!item.lidaEm) {
      await updateInternalNotification({ ...item, lidaEm: agora });
    }
  }
  return contarNotificacoesNaoLidas(userId);
}

export async function obterNotificacaoParaAbrir(userId: number, id: number): Promise<NotificacaoApresentacao> {
  assertPodeConsultarNotificacoes(userId);
  const alvo = await findInternalNotificationById(id);
  if (!alvo || alvo.destinatarioId !== userId) {
    throw new NotificacaoServiceError("Notificação não encontrada.", 404);
  }
  const cadastros = await loadFullOperationalCadastros();
  if (!(await usuarioAcessaRegistro(userId, alvo, cadastros))) {
    throw new NotificacaoServiceError("Registro relacionado fora do seu escopo.", 403);
  }
  return montarApresentacao(alvo);
}

/** Reprocessa evento (testes de idempotência). */
export async function reprocessarEventoRetornoAgendado(atendimentoId: string): Promise<NotificacaoInterna | null> {
  const cadastros = await loadFullOperationalCadastros();
  const atendimento = cadastros.atendimentos.find((item) => item.id === atendimentoId);
  if (!atendimento) return null;
  return emitirNotificacaoRetornoAgendado(atendimento);
}

export function fusoOperacionalNotificacoes() {
  return FUSO_NOTIFICACOES;
}
