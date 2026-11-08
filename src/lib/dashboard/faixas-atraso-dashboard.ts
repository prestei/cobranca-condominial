/** Faixas de atraso usadas nos filtros do dashboard (T33) e em `/debitos`. */
export const FAIXAS_ATRASO_DASHBOARD_ATENDENTE = [
  { id: "ate_30", label: "Até 30 dias", min: 0, max: 30 },
  { id: "de_31_60", label: "De 31 a 60 dias", min: 31, max: 60 },
  { id: "de_61_90", label: "De 61 a 90 dias", min: 61, max: 90 },
  { id: "acima_90", label: "Acima de 90 dias", min: 91, max: Number.POSITIVE_INFINITY },
] as const;

export type FaixaAtrasoDashboardId = (typeof FAIXAS_ATRASO_DASHBOARD_ATENDENTE)[number]["id"];

function deslocarDias(iso: string, delta: number) {
  const base = new Date(`${iso.slice(0, 10)}T12:00:00`);
  base.setDate(base.getDate() + delta);
  return base.toISOString().slice(0, 10);
}

/** Intervalo de vencimento que corresponde à faixa na data-base (para filtros em `/debitos`). */
export function vencimentoParaFaixaDashboard(faixaId: FaixaAtrasoDashboardId, dataBase: string) {
  const faixa = FAIXAS_ATRASO_DASHBOARD_ATENDENTE.find((item) => item.id === faixaId);
  if (!faixa) return null;
  if (faixa.max === Number.POSITIVE_INFINITY) {
    return { vencimentoAte: deslocarDias(dataBase, -faixa.min) };
  }
  const vencimentoAte = deslocarDias(dataBase, -faixa.min);
  const vencimentoDe = deslocarDias(dataBase, -faixa.max);
  return { vencimentoDe, vencimentoAte };
}
