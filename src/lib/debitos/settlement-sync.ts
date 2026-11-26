import {
  agoraIso,
  hojeIso,
  type Debito,
} from "@/data/catalogo";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import { listDebtsByUnit, updateDebt } from "@/lib/db/repositories/debt-repository";
import {
  applyDebtOperationalSituation,
  recordDebtOperationalSituationChange,
} from "@/lib/db/repositories/debt-operational-situation-repository";
import { createDebtSettlement, findSettlementByDebtId } from "@/lib/db/repositories/debt-settlement-repository";
import { listAgreementPayments } from "@/lib/db/repositories/negotiation-repository";
import { listFormalizedProposalDebtLinksByDebtIds } from "@/lib/db/repositories/negotiation-proposal-debt-repository";
import { findUnitById, updateUnit } from "@/lib/db/repositories/unit-repository";
import { listNegotiationProposals } from "@/lib/db/repositories/negotiation-repository";
import {
  closeDelinquencyPeriod,
  listOpenDelinquencyPeriodByUnit,
  openDelinquencyPeriod,
} from "@/lib/db/repositories/unit-delinquency-period-repository";
import {
  inferirSituacaoOperacionalDebito,
  idsDebitosEmNegociacaoAtiva,
  SITUACAO_OPERACIONAL_EM_ABERTO,
  SITUACAO_OPERACIONAL_QUITADA,
  situacaoOperacionalDebito,
} from "@/lib/debitos/operational-situation";
import {
  debitoComObrigacoesCumpridas,
  mapaVinculoObrigacaoPorDebito,
  type VinculoObrigacaoDebito,
} from "@/lib/debitos/settlement-eligibility";
import { situacaoCobrancaDestinoAposReavaliacao } from "@/lib/debitos/unit-situation-reavaluation";
import { monetarioDeCentavos } from "@/lib/negociacoes/parcelamento";
import { centavosMonetarios } from "@/lib/negociacoes/parcelamento";
import { resolverTransicaoPeriodoInadimplencia } from "@/lib/unidades/delinquency-periods";
import { invalidateServiceContextCache } from "@/lib/db/service-context";

export type SyncSettlementMeta = {
  userId?: number | null;
  ip?: string;
  userAgent?: string;
  observacao?: string;
  source?: string;
};

function dataUltimoPagamentoConfirmadoProposta(proposalId: string, pagamentos: Awaited<ReturnType<typeof listAgreementPayments>>): string {
  let max = "";
  for (const item of pagamentos) {
    if (item.propostaId !== proposalId || item.confirmacao !== "Confirmado") continue;
    const dia = item.dataPagamento.slice(0, 10);
    if (dia > max) max = dia;
  }
  return max || hojeIso();
}

async function persistirCamposQuitacaoDebito(
  debito: Debito,
  vinculo: VinculoObrigacaoDebito | null,
  meta: SyncSettlementMeta,
): Promise<Debito> {
  let dataPagamento = debito.dataPagamento;
  let valorPago = debito.valorPago;
  let valorAtualizado = debito.valorAtualizado;

  if (vinculo?.formalizadoEm) {
    const pagamentos = await listAgreementPayments();
    dataPagamento = dataUltimoPagamentoConfirmadoProposta(vinculo.proposalId, pagamentos);
    valorPago = vinculo.valorPagoConfirmado;
    valorAtualizado = "0.00";
  } else if (debito.status !== "Pago" || !debito.valorPago?.trim()) {
    const baseCent = centavosMonetarios(debito.valorAtualizado || debito.valor || debito.valorOriginal);
    valorPago = monetarioDeCentavos(baseCent > 0 ? baseCent : centavosMonetarios(debito.valorPago));
    dataPagamento = debito.dataPagamento?.trim() || hojeIso();
    valorAtualizado = "0.00";
  }

  const atualizado: Debito = {
    ...debito,
    status: "Pago",
    dataPagamento,
    valorPago,
    valorAtualizado,
    fonteValores: "manual",
    atualizadoEm: agoraIso(),
  };
  return updateDebt(atualizado);
}

/** Reavalia quitação dos débitos, situação operacional, períodos e cobrança da unidade (T28). */
export async function reavaliarQuitacaoESituacaoUnidade(
  unitId: number,
  meta?: SyncSettlementMeta,
): Promise<void> {
  const userId = meta?.userId ?? null;
  const alteradoEm = agoraIso();
  const source = meta?.source ?? "reavaliacao";
  const unidade = await findUnitById(unitId);
  if (!unidade) return;

  let debitos = await listDebtsByUnit(unitId);
  const debtIds = debitos.map((item) => item.id);
  const vinculosRaw = await listFormalizedProposalDebtLinksByDebtIds(debtIds);
  const vinculosPorDebito = mapaVinculoObrigacaoPorDebito(
    vinculosRaw.map((item) => ({
      debtId: item.debtId,
      proposalId: item.proposalId,
      formalizadoEm: item.formalizadoEm,
      valorNegociadoAlocado: item.valorNegociadoAlocado,
      valorPagoConfirmado: item.valorPagoConfirmado,
      saldoRestante: item.saldoRestante,
    })),
  );

  const propostasUnidade = (await listNegotiationProposals()).filter((item) => item.unidadeId === unitId);
  const emNegociacao = idsDebitosEmNegociacaoAtiva(propostasUnidade);
  let situacaoUnidadeAntes = unidade.situacao;

  for (const debitoInicial of debitos) {
    let debito = debitoInicial;
    const vinculo = vinculosPorDebito.get(debito.id) ?? null;
    const deveQuitar = debitoComObrigacoesCumpridas(debito, vinculo);
    const sitAtual = situacaoOperacionalDebito(debito);

    if (deveQuitar && sitAtual !== SITUACAO_OPERACIONAL_QUITADA) {
      const debitoComPagamento = await persistirCamposQuitacaoDebito(debito, vinculo, meta);
      const quitacaoExistente = await findSettlementByDebtId(debito.id);
      if (!quitacaoExistente) {
        const pagoCent = vinculo
          ? centavosMonetarios(vinculo.valorPagoConfirmado)
          : centavosMonetarios(debitoComPagamento.valorPago);
        await createDebtSettlement({
          debtId: debito.id,
          unitId,
          settledAt: alteradoEm,
          paidAmount: monetarioDeCentavos(pagoCent),
          proposalId: vinculo?.proposalId ?? null,
          confirmedByUserId: userId,
          unitSituationBefore: situacaoUnidadeAntes,
          unitSituationAfter: null,
          source,
          notes: meta?.observacao,
        });
      }
      debito = { ...debitoComPagamento };
    }

    const nova = inferirSituacaoOperacionalDebito(debito, emNegociacao.has(debito.id), vinculo);
    const anterior = debito.situacaoOperacional?.trim() || SITUACAO_OPERACIONAL_EM_ABERTO;
    if (anterior === nova) continue;

    await recordDebtOperationalSituationChange({
      debtId: debito.id,
      previousSituation: anterior,
      newSituation: nova,
      userId,
      changedAt: alteradoEm,
      notes: meta?.observacao ?? "Atualização automática de quitação (T28)",
    });

    const salvo = await applyDebtOperationalSituation(debito.id, nova, userId, alteradoEm);
    await writeAuditLog({
      entity: "debt",
      recordId: String(debito.id),
      action: "UPDATE",
      previousData: JSON.stringify({ situacaoOperacional: anterior }),
      newData: JSON.stringify({ situacaoOperacional: salvo.situacaoOperacional }),
      changedFields: "situacao_operacional",
      userId: userId ?? undefined,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
  }

  debitos = await listDebtsByUnit(unitId);
  const periodoAberto = await listOpenDelinquencyPeriodByUnit(unitId);
  const transicao = resolverTransicaoPeriodoInadimplencia(debitos, periodoAberto);

  if (transicao.tipo === "abrir") {
    await openDelinquencyPeriod(unitId, transicao.inicioEm, userId);
    await writeAuditLog({
      entity: "unit",
      recordId: String(unitId),
      action: "UPDATE",
      previousData: "",
      newData: JSON.stringify({ periodoInadimplencia: { inicioEm: transicao.inicioEm } }),
      changedFields: "periodo_inadimplencia",
      userId: userId ?? undefined,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
  } else if (transicao.tipo === "fechar" && periodoAberto) {
    await closeDelinquencyPeriod(periodoAberto.id, transicao.fimEm, userId);
    await writeAuditLog({
      entity: "unit",
      recordId: String(unitId),
      action: "UPDATE",
      previousData: JSON.stringify({ periodoId: periodoAberto.id, inicioEm: periodoAberto.inicioEm }),
      newData: JSON.stringify({ fimEm: transicao.fimEm }),
      changedFields: "periodo_inadimplencia",
      userId: userId ?? undefined,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
  }

  const unidadeAtualizada = (await findUnitById(unitId)) ?? unidade;
  const novaSituacao = situacaoCobrancaDestinoAposReavaliacao(unidadeAtualizada, debitos);
  if (novaSituacao) {
    const salva = await updateUnit({ ...unidadeAtualizada, situacao: novaSituacao });
    await writeAuditLog({
      entity: "unit",
      recordId: String(unitId),
      action: "UPDATE",
      previousData: JSON.stringify({ situacao: unidadeAtualizada.situacao }),
      newData: JSON.stringify({ situacao: salva.situacao, motivo: "reavaliacao_quitacao_T28" }),
      changedFields: "situacao",
      userId: userId ?? undefined,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
    situacaoUnidadeAntes = unidadeAtualizada.situacao;
  }

  invalidateServiceContextCache();
}

/** Reavalia um débito individual após alteração pontual. */
export async function reavaliarQuitacaoAposGravarDebito(
  debito: Debito,
  meta?: SyncSettlementMeta,
): Promise<void> {
  await reavaliarQuitacaoESituacaoUnidade(debito.unidadeId, {
    ...meta,
    source: meta?.source ?? "debito_gravado",
  });
}