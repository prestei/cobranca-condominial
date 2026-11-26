import type { Debito } from "@/data/catalogo";
import {
  reavaliarQuitacaoAposGravarDebito,
  reavaliarQuitacaoESituacaoUnidade,
  type SyncSettlementMeta,
} from "@/lib/debitos/settlement-sync";

export type SyncOperationalMeta = SyncSettlementMeta;

/** Recalcula quitação, situação operacional dos débitos, períodos e cobrança da unidade (T28). */
export async function sincronizarSituacaoOperacionalUnidade(
  unitId: number,
  meta?: SyncOperationalMeta,
): Promise<void> {
  await reavaliarQuitacaoESituacaoUnidade(unitId, meta);
}

/** Aplica reavaliação após gravar débito (create/update manual ou importação). */
export async function sincronizarSituacaoOperacionalAposGravarDebito(
  debito: Debito,
  meta?: SyncOperationalMeta,
): Promise<void> {
  await reavaliarQuitacaoAposGravarDebito(debito, meta);
}