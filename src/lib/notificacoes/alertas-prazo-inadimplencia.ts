import {
  condominioAtivo,
  debitoEmAberto,
  formatarData,
  hojeIso,
  unidadeNaFilaCobrancaAtiva,
  type Cadastros,
  type Condominio,
  type Debito,
  type Unidade,
} from "@/data/catalogo";
import {
  computeDelinquencyTracking,
  delinquencyTrackingStatusLabel,
  resolveDelinquencyTrackingDays,
  type DelinquencyTrackingStatus,
} from "@/lib/inadimplencia/delinquency-tracking";

export const CHAVE_APP_SETTING_ALERTAS_PRAZO = "alertas_prazo_inadimplencia";

/** Antecedências padrão quando a administração não configurou intervalos. */
export const ANTECEDENCIAS_PADRAO_DIAS = [15, 7, 3] as const;

export type AlertasPrazoInadimplenciaConfig = {
  antecedenciasDias: number[];
};

export type MarcoAlertaPrazoInadimplencia =
  | { tipo: "antecedencia"; dias: number }
  | { tipo: "prazo_atingido" }
  | { tipo: "prazo_ultrapassado" };

export type EventoNotificacaoPrazoInadimplencia =
  | "inadimplencia_prazo_antecedencia"
  | "inadimplencia_prazo_atingido"
  | "inadimplencia_prazo_ultrapassado";

export type DebitoElegivelPrazo = {
  debito: Debito;
  unidade: Unidade;
  condominio: Condominio;
};

export function configPadraoAlertasPrazo(): AlertasPrazoInadimplenciaConfig {
  return { antecedenciasDias: [...ANTECEDENCIAS_PADRAO_DIAS] };
}

export function normalizarAntecedenciasDias(
  value: unknown,
): { ok: true; value: number[] } | { ok: false; message: string } {
  if (value === null || value === undefined) {
    return { ok: true, value: [...ANTECEDENCIAS_PADRAO_DIAS] };
  }
  if (!Array.isArray(value)) {
    return { ok: false, message: "Informe uma lista de dias de antecedência." };
  }
  const numeros: number[] = [];
  for (const item of value) {
    const n = typeof item === "number" ? item : Number(String(item).trim());
    if (!Number.isInteger(n) || n < 1) {
      return { ok: false, message: "Cada antecedência deve ser um inteiro maior que zero." };
    }
    if (!numeros.includes(n)) numeros.push(n);
  }
  numeros.sort((a, b) => b - a);
  return { ok: true, value: numeros };
}

export function parseConfigAlertasPrazo(raw: unknown): AlertasPrazoInadimplenciaConfig {
  if (!raw || typeof raw !== "object") return configPadraoAlertasPrazo();
  const antecedencias = normalizarAntecedenciasDias((raw as { antecedenciasDias?: unknown }).antecedenciasDias);
  if (!antecedencias.ok) return configPadraoAlertasPrazo();
  return { antecedenciasDias: antecedencias.value };
}

export function debitoElegivelAlertaPrazo(
  debito: Debito,
  cadastros: Cadastros,
): DebitoElegivelPrazo | null {
  if (!debitoEmAberto(debito)) return null;
  const unidade = cadastros.unidades.find((item) => item.id === debito.unidadeId);
  if (!unidade || unidade.status === "Inativa") return null;
  if (!unidadeNaFilaCobrancaAtiva(unidade)) return null;
  const condominio = cadastros.condominios.find((item) => item.id === debito.condominioId);
  if (!condominio || !condominioAtivo(condominio)) return null;
  return { debito, unidade, condominio };
}

export function marcosAlertaParaDebito(
  debito: Debito,
  condominio: Condominio,
  dataReferencia: string,
  config: AlertasPrazoInadimplenciaConfig,
): MarcoAlertaPrazoInadimplencia[] {
  const trackingDays = resolveDelinquencyTrackingDays(condominio);
  const tracking = computeDelinquencyTracking(debito.dataVencimento, dataReferencia, trackingDays);
  if (tracking.elapsedDays <= 0) return [];

  const marcos: MarcoAlertaPrazoInadimplencia[] = [];
  for (const dias of config.antecedenciasDias) {
    if (tracking.remainingDays === dias) {
      marcos.push({ tipo: "antecedencia", dias });
    }
  }
  if (tracking.status === "term_reached") {
    marcos.push({ tipo: "prazo_atingido" });
  }
  if (tracking.status === "term_exceeded") {
    marcos.push({ tipo: "prazo_ultrapassado" });
  }
  return marcos;
}

export function chaveIdempotenciaAlertaPrazo(
  debitoId: number,
  trackingDays: number,
  marco: MarcoAlertaPrazoInadimplencia,
): string {
  const sufixo =
    marco.tipo === "antecedencia"
      ? `antecedencia_${marco.dias}`
      : marco.tipo === "prazo_atingido"
        ? "atingido"
        : "ultrapassado";
  return `inadimplencia_prazo:${debitoId}:${trackingDays}:${sufixo}`;
}

export function eventoNotificacaoParaMarco(marco: MarcoAlertaPrazoInadimplencia): EventoNotificacaoPrazoInadimplencia {
  if (marco.tipo === "antecedencia") return "inadimplencia_prazo_antecedencia";
  if (marco.tipo === "prazo_atingido") return "inadimplencia_prazo_atingido";
  return "inadimplencia_prazo_ultrapassado";
}

export function tituloNotificacaoPrazo(marco: MarcoAlertaPrazoInadimplencia): string {
  if (marco.tipo === "antecedencia") {
    const dia = marco.dias === 1 ? "1 dia" : `${marco.dias} dias`;
    return `Prazo de inadimplência em ${dia}`;
  }
  if (marco.tipo === "prazo_atingido") return "Prazo de inadimplência atingido";
  return "Prazo de inadimplência ultrapassado";
}

export type LinhasDescricaoPrazo = {
  condominioNome: string;
  unidadeIdentificacao: string;
  inadimplenciaRotulo: string;
  prazoDias: number;
  dataReferencia: string;
  diasTranscorridos: number;
  diasRestantes: number;
  status: DelinquencyTrackingStatus;
  responsavelRotulo: string;
};

export function montarDescricaoNotificacaoPrazo(linhas: LinhasDescricaoPrazo): string {
  const dataRef = formatarData(linhas.dataReferencia);
  const statusLabel = delinquencyTrackingStatusLabel(linhas.status);
  return [
    `Condomínio: ${linhas.condominioNome}`,
    `Unidade: ${linhas.unidadeIdentificacao}`,
    `Inadimplência: ${linhas.inadimplenciaRotulo}`,
    `Prazo configurado: ${linhas.prazoDias} dias`,
    `Data de referência: ${dataRef}`,
    `Dias transcorridos: ${linhas.diasTranscorridos}`,
    `Dias restantes: ${linhas.diasRestantes}`,
    `Status: ${statusLabel}`,
    `Atendente responsável: ${linhas.responsavelRotulo}`,
  ].join(" · ");
}

/** Referência padrão do painel na data atual (fuso operacional da aplicação). */
export function dataReferenciaPadraoAlertasPrazo(): string {
  return hojeIso();
}
