import { diasDeAtraso, LIMITE_AMIGAVEL_DIAS, type Cadastros, type Condominio } from "@/data/catalogo";

/** Prazo padrão quando o condomínio não tem configuração (alinhado a `LIMITE_AMIGAVEL_DIAS`). */
export const DEFAULT_DELINQUENCY_TRACKING_DAYS = LIMITE_AMIGAVEL_DIAS;

export type DelinquencyTrackingStatus =
  | "no_arrears"
  | "within_term"
  | "near_term_limit"
  | "term_reached"
  | "term_exceeded";

export type DelinquencyTrackingMetrics = {
  trackingDays: number;
  elapsedDays: number;
  remainingDays: number;
  status: DelinquencyTrackingStatus;
  usesDefaultTrackingDays: boolean;
};

export function resolveDelinquencyTrackingDays(
  condominium: Pick<Condominio, "delinquencyTrackingDays"> | null | undefined,
): number {
  const configured = condominium?.delinquencyTrackingDays;
  if (configured != null && Number.isInteger(configured) && configured >= 1) {
    return configured;
  }
  return DEFAULT_DELINQUENCY_TRACKING_DAYS;
}

export function delinquencyTrackingDaysForCondominiumId(condominiumId: number, catalog: Cadastros): number {
  const condominium = catalog.condominios.find((item) => item.id === condominiumId);
  return resolveDelinquencyTrackingDays(condominium);
}

/** Texto de apoio no cabeçalho dos painéis por condomínio (Unidades, Inadimplência, Condomínios). */
export function delinquencyTrackingDaysCaption(
  condominium: Pick<Condominio, "delinquencyTrackingDays"> | null | undefined,
): string {
  const dias = resolveDelinquencyTrackingDays(condominium);
  const personalizado = condominium?.delinquencyTrackingDays != null;
  return personalizado
    ? `Prazo inadimplência: ${dias} dias`
    : `Prazo inadimplência: ${dias} dias (padrão)`;
}

export function delinquencyTrackingDaysCaptionForCondominiumId(
  condominiumId: number,
  catalog: Cadastros,
): string {
  const condominium = catalog.condominios.find((item) => item.id === condominiumId) ?? null;
  return delinquencyTrackingDaysCaption(condominium);
}

export function classifyDelinquencyTrackingStatus(elapsedDays: number, trackingDays: number): DelinquencyTrackingStatus {
  if (elapsedDays <= 0) return "no_arrears";
  if (elapsedDays > trackingDays) return "term_exceeded";
  if (elapsedDays === trackingDays) return "term_reached";
  if (elapsedDays >= trackingDays - 1) return "near_term_limit";
  return "within_term";
}

/** Contagem a partir do vencimento até a data-base do painel (não altera datas financeiras originais). */
export function computeDelinquencyTracking(
  dueDate: string,
  referenceDate: string,
  trackingDays: number,
): DelinquencyTrackingMetrics {
  const elapsedDays = diasDeAtraso(dueDate, referenceDate);
  const status = classifyDelinquencyTrackingStatus(elapsedDays, trackingDays);
  const remainingDays = elapsedDays >= trackingDays ? 0 : Math.max(0, trackingDays - elapsedDays);
  return {
    trackingDays,
    elapsedDays,
    remainingDays,
    status,
    usesDefaultTrackingDays: false,
  };
}

export function computeDelinquencyTrackingForDebt(
  condominiumId: number,
  dueDate: string,
  referenceDate: string,
  catalog: Cadastros,
): DelinquencyTrackingMetrics {
  const condominium = catalog.condominios.find((item) => item.id === condominiumId);
  const trackingDays = resolveDelinquencyTrackingDays(condominium);
  const metrics = computeDelinquencyTracking(dueDate, referenceDate, trackingDays);
  return {
    ...metrics,
    usesDefaultTrackingDays: condominium?.delinquencyTrackingDays == null,
  };
}

export function isAboveDelinquencyTrackingLimit(elapsedDays: number, trackingDays: number): boolean {
  return elapsedDays >= trackingDays;
}

export function parseDelinquencyTrackingDaysInput(
  value: unknown,
): { ok: true; value: number | null } | { ok: false; message: string } {
  if (value === null || value === undefined || value === "") {
    return { ok: true, value: null };
  }
  const numero = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isInteger(numero) || numero < 1) {
    return { ok: false, message: "Informe um prazo inteiro maior que zero ou deixe em branco para o padrão." };
  }
  return { ok: true, value: numero };
}

export function delinquencyTrackingStatusLabel(status: DelinquencyTrackingStatus): string {
  switch (status) {
    case "no_arrears":
      return "Em dia na data-base";
    case "within_term":
      return "Dentro do prazo";
    case "near_term_limit":
      return "Próximo do limite";
    case "term_reached":
      return "Prazo atingido";
    case "term_exceeded":
      return "Prazo ultrapassado";
    default:
      return "—";
  }
}
