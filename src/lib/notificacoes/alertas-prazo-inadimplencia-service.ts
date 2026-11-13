import { type Cadastros } from "@/data/catalogo";
import { loadFullOperationalCadastros } from "@/lib/db/cadastros-scope";
import { getAppSetting, setAppSetting } from "@/lib/db/repositories/app-setting-repository";
import { openAssignmentForUnit } from "@/lib/db/service-context";
import { codigoReDoUsuario } from "@/lib/colaboradores/re-server";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";
import {
  type AlertasPrazoInadimplenciaConfig,
  CHAVE_APP_SETTING_ALERTAS_PRAZO,
  chaveIdempotenciaAlertaPrazo,
  configPadraoAlertasPrazo,
  dataReferenciaPadraoAlertasPrazo,
  debitoElegivelAlertaPrazo,
  eventoNotificacaoParaMarco,
  marcosAlertaParaDebito,
  montarDescricaoNotificacaoPrazo,
  normalizarAntecedenciasDias,
  parseConfigAlertasPrazo,
  tituloNotificacaoPrazo,
} from "@/lib/notificacoes/alertas-prazo-inadimplencia";
import {
  computeDelinquencyTracking,
  resolveDelinquencyTrackingDays,
} from "@/lib/inadimplencia/delinquency-tracking";
import { agoraIso, type NotificacaoInterna } from "@/data/catalogo";
import {
  createInternalNotification,
  findInternalNotificationByIdempotencyKey,
  nextNotificationFailureId,
  prependNotificationFailure,
} from "@/lib/db/repositories/notification-repository";
import { loadCadastrosForScope } from "@/lib/db/cadastros-scope";
import { destinatarioPodeReceberNotificacaoOperacional } from "@/lib/notificacoes/recipient-eligibility";
import { dispatchPushForInternalNotification } from "@/lib/notificacoes/push-dispatch";

export class AlertasPrazoInadimplenciaServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

let configMemoria: AlertasPrazoInadimplenciaConfig = configPadraoAlertasPrazo();

/** Somente testes — simula falha ao persistir notificação de prazo. */
let simularFalhaPersistenciaPrazo = false;

export function setSimularFalhaNotificacaoPrazo(ativo: boolean) {
  simularFalhaPersistenciaPrazo = ativo;
}

async function persistirNotificacaoPrazo(
  input: Omit<NotificacaoInterna, "id" | "criadoEm" | "lidaEm">,
): Promise<NotificacaoInterna | null> {
  if (!(await destinatarioPodeReceberNotificacaoOperacional(input.destinatarioId))) {
    return null;
  }
  const existente = await findInternalNotificationByIdempotencyKey(input.chaveIdempotencia);
  if (existente) return existente;

  if (simularFalhaPersistenciaPrazo) {
    await prependNotificationFailure({
      id: await nextNotificationFailureId(),
      chaveIdempotencia: input.chaveIdempotencia,
      evento: input.evento,
      destinatarioId: input.destinatarioId,
      erro: "Falha simulada do alerta de prazo.",
      ocorridoEm: agoraIso(),
    });
    return null;
  }

  try {
    const salvo = await createInternalNotification({
      criadoEm: agoraIso(),
      lidaEm: null,
      ...input,
    });
    void dispatchPushForInternalNotification(salvo);
    return salvo;
  } catch (error) {
    await prependNotificationFailure({
      id: await nextNotificationFailureId(),
      chaveIdempotencia: input.chaveIdempotencia,
      evento: input.evento,
      destinatarioId: input.destinatarioId,
      erro: error instanceof Error ? error.message : "Erro desconhecido ao gravar notificação.",
      ocorridoEm: agoraIso(),
    });
    return null;
  }
}

export function obterConfigAlertasPrazoInadimplencia(): AlertasPrazoInadimplenciaConfig {
  return { ...configMemoria, antecedenciasDias: [...configMemoria.antecedenciasDias] };
}

export async function hidratarConfigAlertasPrazoDoPostgres(): Promise<void> {
  const valor = await getAppSetting(CHAVE_APP_SETTING_ALERTAS_PRAZO);
  configMemoria = parseConfigAlertasPrazo(valor);
}

export async function atualizarConfigAlertasPrazoInadimplencia(
  userId: number,
  patch: { antecedenciasDias?: unknown },
): Promise<AlertasPrazoInadimplenciaConfig> {
  const cadastros = await loadFullOperationalCadastros();
  const perm = permissoesDoUsuarioId(userId, cadastros);
  if (!temPermissao(perm, "usuarios", "criar")) {
    throw new AlertasPrazoInadimplenciaServiceError("Sem permissão para alterar alertas de prazo.", 403);
  }

  if (patch.antecedenciasDias !== undefined) {
    const parsed = normalizarAntecedenciasDias(patch.antecedenciasDias);
    if (!parsed.ok) {
      throw new AlertasPrazoInadimplenciaServiceError(parsed.message, 400);
    }
    configMemoria = { antecedenciasDias: parsed.value };
  }

  await setAppSetting(CHAVE_APP_SETTING_ALERTAS_PRAZO, configMemoria);
  return obterConfigAlertasPrazoInadimplencia();
}

function resolverUsuarioAdministracao(cadastros: Cadastros): number | null {
  const gestor = cadastros.usuarios.find(
    (item) => item.ativo !== false && temPermissao(permissoesDoUsuarioId(item.id, cadastros), "usuarios", "criar"),
  );
  return gestor?.id ?? null;
}

async function resolverDestinatarioAlerta(
  cadastros: Cadastros,
  unidadeId: number,
): Promise<{ destinatarioId: number; responsavelRotulo: string } | null> {
  const vigente = await openAssignmentForUnit(unidadeId);
  if (vigente?.atendenteId) {
    const atendente = cadastros.usuarios.find((item) => item.id === vigente.atendenteId);
    const perm = atendente ? permissoesDoUsuarioId(atendente.id, cadastros) : null;
    if (atendente && perm && temPermissao(perm, "atendimentos", "ler")) {
      return {
        destinatarioId: atendente.id,
        responsavelRotulo: codigoReDoUsuario(atendente) || atendente.nome,
      };
    }
  }

  const adminId = resolverUsuarioAdministracao(cadastros);
  if (!adminId) return null;
  return {
    destinatarioId: adminId,
    responsavelRotulo: "Sem atendente — encaminhado à administração",
  };
}

function rotuloInadimplencia(debito: { referencia: string; descricao: string }): string {
  const ref = debito.referencia.trim() || "—";
  const desc = debito.descricao.trim();
  return desc ? `${ref} — ${desc}` : ref;
}

export type ResultadoProcessamentoAlertasPrazo = {
  candidatos: number;
  emitidas: number;
  ignoradas: number;
};

/**
 * Verifica débitos em acompanhamento e emite notificações in-app por marco de prazo (idempotente).
 */
export async function processarAlertasPrazoInadimplencia(
  dataReferencia = dataReferenciaPadraoAlertasPrazo(),
): Promise<ResultadoProcessamentoAlertasPrazo> {
  const cadastros = await loadFullOperationalCadastros();
  const config = obterConfigAlertasPrazoInadimplencia();
  let candidatos = 0;
  let emitidas = 0;
  let ignoradas = 0;

  for (const debito of cadastros.debitos) {
    const elegivel = debitoElegivelAlertaPrazo(debito, cadastros);
    if (!elegivel) continue;

    const marcos = marcosAlertaParaDebito(
      debito,
      elegivel.condominio,
      dataReferencia,
      config,
    );
    if (marcos.length === 0) continue;

    candidatos += marcos.length;
    const destinatario = await resolverDestinatarioAlerta(cadastros, elegivel.unidade.id);
    if (!destinatario) {
      ignoradas += marcos.length;
      continue;
    }

    const trackingDays = resolveDelinquencyTrackingDays(elegivel.condominio);
    const tracking = computeDelinquencyTracking(debito.dataVencimento, dataReferencia, trackingDays);

    for (const marco of marcos) {
      const criada = await persistirNotificacaoPrazo({
        chaveIdempotencia: chaveIdempotenciaAlertaPrazo(debito.id, trackingDays, marco),
        evento: eventoNotificacaoParaMarco(marco),
        destinatarioId: destinatario.destinatarioId,
        titulo: tituloNotificacaoPrazo(marco),
        descricao: montarDescricaoNotificacaoPrazo({
          condominioNome: elegivel.condominio.nome,
          unidadeIdentificacao: elegivel.unidade.identificacao,
          inadimplenciaRotulo: rotuloInadimplencia(debito),
          prazoDias: trackingDays,
          dataReferencia,
          diasTranscorridos: tracking.elapsedDays,
          diasRestantes: tracking.remainingDays,
          status: tracking.status,
          responsavelRotulo: destinatario.responsavelRotulo,
        }),
        entidadeTipo: "debt",
        registroId: String(debito.id),
        unidadeId: elegivel.unidade.id,
        condominioId: elegivel.condominio.id,
      });
      if (criada) emitidas += 1;
      else ignoradas += 1;
    }
  }

  return { candidatos, emitidas, ignoradas };
}

/** Apenas testes — restaura config padrão em memória. */
export function resetConfigAlertasPrazoParaTestes() {
  configMemoria = configPadraoAlertasPrazo();
}
