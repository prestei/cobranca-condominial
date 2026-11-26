import { agoraIso, type Debito, type PropostaNegociacao } from "@/data/catalogo";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import { findDebtById, updateDebt } from "@/lib/db/repositories/debt-repository";
import { listAgreementPayments } from "@/lib/db/repositories/negotiation-repository";
import {
  listProposalDebtLinksByProposal,
  recordProposalDebtFinancialChange,
  updateProposalDebtFinancial,
  type VinculoNegociacaoDebito,
} from "@/lib/db/repositories/negotiation-proposal-debt-repository";
import {
  calcularSaldoRestanteNegociado,
  planejarAlocacaoNegociacao,
  repartirPagamentosConfirmados,
} from "@/lib/debitos/negotiation-financial";
import { SITUACAO_OPERACIONAL_EM_NEGOCIACAO } from "@/lib/debitos/operational-situation";
import { applyDebtOperationalSituation } from "@/lib/db/repositories/debt-operational-situation-repository";
import { centavosMonetarios, monetarioDeCentavos } from "@/lib/negociacoes/parcelamento";
import { invalidateServiceContextCache } from "@/lib/db/service-context";
import { findNegotiationProposalById } from "@/lib/db/repositories/negotiation-repository";
import { reavaliarQuitacaoESituacaoUnidade } from "@/lib/debitos/settlement-sync";

export type DebitoNegociacaoFinanceira = {
  propostaId: string;
  valorOriginal: string;
  valorNegociado: string;
  descontoConcedido: string;
  valorPagoConfirmado: string;
  saldoRestante: string;
  situacao: string;
  formalizadoEm: string;
};

export type SyncNegotiationFinancialMeta = {
  userId?: number | null;
  ip?: string;
  userAgent?: string;
  observacao?: string;
};

async function somaPagamentosConfirmadosProposta(proposalId: string): Promise<number> {
  const pagamentos = await listAgreementPayments();
  return pagamentos
    .filter((item) => item.propostaId === proposalId && item.confirmacao === "Confirmado")
    .reduce((sum, item) => sum + centavosMonetarios(item.valor), 0);
}

async function aplicarVinculoFinanceiro(
  vinculo: VinculoNegociacaoDebito,
  dados: {
    valorOriginalRegistrado: string;
    valorNegociadoAlocado: string;
    descontoConcedido: string;
    valorPagoConfirmado: string;
    saldoRestante: string;
    formalizadoEm: string;
    formalizadoPorId: number | null;
  },
  meta?: SyncNegotiationFinancialMeta,
): Promise<void> {
  const campos: Array<keyof typeof dados> = [
    "valorOriginalRegistrado",
    "valorNegociadoAlocado",
    "descontoConcedido",
    "valorPagoConfirmado",
    "saldoRestante",
  ];
  const anterior = {
    valorOriginalRegistrado: vinculo.valorOriginalRegistrado,
    valorNegociadoAlocado: vinculo.valorNegociadoAlocado,
    descontoConcedido: vinculo.descontoConcedido,
    valorPagoConfirmado: vinculo.valorPagoConfirmado,
    saldoRestante: vinculo.saldoRestante,
  };

  await updateProposalDebtFinancial(vinculo.id, dados);

  for (const campo of campos) {
    const mapaCampo: Record<string, string> = {
      valorOriginalRegistrado: "valor_original_registrado",
      valorNegociadoAlocado: "valor_negociado_alocado",
      descontoConcedido: "desconto_concedido",
      valorPagoConfirmado: "valor_pago_confirmado",
      saldoRestante: "saldo_restante",
    };
    const ant = anterior[campo];
    const novo = dados[campo];
    if (ant === novo) continue;
    await recordProposalDebtFinancialChange({
      linkId: vinculo.id,
      debtId: vinculo.debtId,
      proposalId: vinculo.proposalId,
      fieldName: mapaCampo[campo] ?? campo,
      previousValue: ant,
      newValue: novo,
      userId: meta?.userId,
      notes: meta?.observacao,
    });
  }

  const debito = await findDebtById(vinculo.debtId);
  if (!debito) return;

  const valorAtualizadoAnterior = debito.valorAtualizado;
  const debitoAtualizado: Debito = {
    ...debito,
    valorAtualizado: dados.saldoRestante,
    fonteValores: "manual",
    atualizadoEm: agoraIso(),
    situacaoOperacional: SITUACAO_OPERACIONAL_EM_NEGOCIACAO,
    situacaoOperacionalAlteradaEm: agoraIso(),
    usuarioSituacaoOperacionalId: meta?.userId ?? debito.usuarioSituacaoOperacionalId,
  };
  const salvo = await updateDebt(debitoAtualizado);
  await applyDebtOperationalSituation(
    salvo.id,
    SITUACAO_OPERACIONAL_EM_NEGOCIACAO,
    meta?.userId ?? null,
    agoraIso(),
  );

  await writeAuditLog({
    entity: "debt",
    recordId: String(salvo.id),
    action: "UPDATE",
    previousData: JSON.stringify({ valorAtualizado: valorAtualizadoAnterior }),
    newData: JSON.stringify({
      valorAtualizado: salvo.valorAtualizado,
      negociacaoPropostaId: vinculo.proposalId,
      saldoRestanteNegociacao: dados.saldoRestante,
    }),
    changedFields: "valor_atualizado, situacao_operacional",
    userId: meta?.userId ?? undefined,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
}

/** Formaliza o impacto financeiro da negociação nos débitos vinculados. */
export async function formalizarFinanceiroNegociacao(
  proposta: PropostaNegociacao,
  meta?: SyncNegotiationFinancialMeta,
): Promise<void> {
  if (proposta.status !== "Aceita" || !proposta.acordoConfirmadoEm.trim()) return;

  const debitos: Debito[] = [];
  for (const id of proposta.debitoIds ?? []) {
    const debito = await findDebtById(id);
    if (debito) debitos.push(debito);
  }
  if (debitos.length === 0) return;

  const alocacoes = planejarAlocacaoNegociacao(debitos, proposta.valorProposto);
  const vinculos = await listProposalDebtLinksByProposal(proposta.id);
  const formalizadoEm = proposta.acordoConfirmadoEm || agoraIso();
  const formalizadoPorId = proposta.acordoConfirmadoPorId ?? meta?.userId ?? null;

  for (const aloc of alocacoes) {
    const vinculo = vinculos.find((item) => item.debtId === aloc.debtId);
    if (!vinculo) continue;
    await aplicarVinculoFinanceiro(
      vinculo,
      {
        valorOriginalRegistrado: aloc.valorOriginalRegistrado,
        valorNegociadoAlocado: aloc.valorNegociadoAlocado,
        descontoConcedido: aloc.descontoConcedido,
        valorPagoConfirmado: "0.00",
        saldoRestante: aloc.saldoRestante,
        formalizadoEm,
        formalizadoPorId,
      },
      { ...meta, observacao: "Formalização da negociação (T25)" },
    );
  }
  await reavaliarQuitacaoESituacaoUnidade(proposta.unidadeId, {
    ...meta,
    source: "negociacao_formalizada",
    observacao: "Formalização da negociação (T25/T28)",
  });
  invalidateServiceContextCache();
}

/** Recalcula saldos dos débitos conforme pagamentos confirmados do acordo. */
export async function sincronizarFinanceiroPagamentosAcordo(
  propostaId: string,
  meta?: SyncNegotiationFinancialMeta,
): Promise<void> {
  const vinculos = (await listProposalDebtLinksByProposal(propostaId)).filter((item) =>
    Boolean(item.formalizadoEm),
  );
  if (vinculos.length === 0) return;

  const totalPagoCent = await somaPagamentosConfirmadosProposta(propostaId);
  const reparte = repartirPagamentosConfirmados(
    vinculos.map((v) => ({
      debtId: v.debtId,
      valorNegociadoAlocado: v.valorNegociadoAlocado,
    })),
    totalPagoCent,
  );

  for (const vinculo of vinculos) {
    const pagoCent = reparte.get(vinculo.debtId) ?? 0;
    const negociadoCent = centavosMonetarios(vinculo.valorNegociadoAlocado);
    const saldoCent = calcularSaldoRestanteNegociado(negociadoCent, pagoCent);
    await aplicarVinculoFinanceiro(
      vinculo,
      {
        valorOriginalRegistrado: vinculo.valorOriginalRegistrado,
        valorNegociadoAlocado: vinculo.valorNegociadoAlocado,
        descontoConcedido: vinculo.descontoConcedido,
        valorPagoConfirmado: monetarioDeCentavos(pagoCent),
        saldoRestante: monetarioDeCentavos(saldoCent),
        formalizadoEm: vinculo.formalizadoEm,
        formalizadoPorId: vinculo.formalizadoPorId,
      },
      { ...meta, observacao: "Atualização por pagamento confirmado (T25)" },
    );
  }
  const proposta = await findNegotiationProposalById(propostaId);
  if (proposta) {
    await reavaliarQuitacaoESituacaoUnidade(proposta.unidadeId, {
      ...meta,
      source: "pagamento_confirmado",
      observacao: "Pagamento confirmado no acordo (T28)",
    });
  }
  invalidateServiceContextCache();
}

/** Monta mapa de informações de negociação por débito (proposta Aceita mais recente). */
export function mapaNegociacaoFinanceiraPorDebito(
  vinculos: VinculoNegociacaoDebito[],
): Map<number, DebitoNegociacaoFinanceira> {
  const mapa = new Map<number, DebitoNegociacaoFinanceira>();
  for (const item of vinculos) {
    if (!item.formalizadoEm) continue;
    if (mapa.has(item.debtId)) continue;
    mapa.set(item.debtId, {
      propostaId: item.proposalId,
      valorOriginal: item.valorOriginalRegistrado,
      valorNegociado: item.valorNegociadoAlocado,
      descontoConcedido: item.descontoConcedido,
      valorPagoConfirmado: item.valorPagoConfirmado,
      saldoRestante: item.saldoRestante,
      situacao: "Em negociação",
      formalizadoEm: item.formalizadoEm,
    });
  }
  return mapa;
}