import { type Debito } from "@/data/catalogo";
import { centavosMonetarios } from "@/lib/negociacoes/parcelamento";

/** Vínculo formalizado (obrigação financeira persistida após acordo, não a mera proposta). */
export type VinculoObrigacaoDebito = {
  proposalId: string;
  formalizadoEm: string;
  valorNegociadoAlocado: string;
  valorPagoConfirmado: string;
  saldoRestante: string;
};

/**
 * Indica se todas as obrigações financeiras do débito foram cumpridas com confirmação persistida.
 * Acordo formalizado sem pagamento confirmado ≠ quitação.
 */
export function debitoComObrigacoesCumpridas(
  debito: Pick<Debito, "status" | "dataPagamento" | "valorPago">,
  vinculoFormalizado: VinculoObrigacaoDebito | null | undefined,
): boolean {
  if (vinculoFormalizado?.formalizadoEm?.trim()) {
    const negociadoCent = centavosMonetarios(vinculoFormalizado.valorNegociadoAlocado);
    if (negociadoCent <= 0) return false;
    const saldoCent = centavosMonetarios(vinculoFormalizado.saldoRestante);
    const pagoCent = centavosMonetarios(vinculoFormalizado.valorPagoConfirmado);
    return saldoCent <= 0 && pagoCent >= negociadoCent;
  }

  if (debito.status !== "Pago") return false;
  if (!debito.dataPagamento?.trim()) return false;
  const valorPagoCent = centavosMonetarios(debito.valorPago);
  return valorPagoCent > 0;
}

export type VinculoComDebtId = VinculoObrigacaoDebito & { debtId: number };

export function mapaVinculoObrigacaoPorDebito(vinculos: VinculoComDebtId[]): Map<number, VinculoObrigacaoDebito> {
  const mapa = new Map<number, VinculoObrigacaoDebito>();
  for (const item of vinculos) {
    if (mapa.has(item.debtId)) continue;
    mapa.set(item.debtId, item);
  }
  return mapa;
}