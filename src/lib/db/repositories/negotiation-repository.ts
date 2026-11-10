import type { PagamentoAcordo, ParcelaAcordo, PropostaNegociacao } from "@/data/catalogo";
import { prisma } from "@/lib/db/prisma";
import {
  dateFromIsoDate,
  dateFromIsoDateTime,
  decimalFromString,
  mapInstallmentToParcela,
  mapPaymentToPagamento,
  mapProposalToProposta,
} from "@/lib/db/mappers";

function texto(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function propostaToData(item: PropostaNegociacao) {
  return {
    id: item.id,
    condominiumId: item.condominioId,
    unitId: item.unidadeId,
    userId: item.usuarioId,
    createdAt: dateFromIsoDateTime(item.criadoEm) ?? new Date(),
    status: item.status,
    proposedAmount: decimalFromString(item.valorProposto) ?? 0,
    notes: texto(item.observacoes),
    debtIdsJson: JSON.stringify(item.debitoIds ?? []),
    agreementConfirmedAt: item.acordoConfirmadoEm ? dateFromIsoDateTime(item.acordoConfirmadoEm) : null,
    agreementConfirmedById: item.acordoConfirmadoPorId,
    approvedTerms: texto(item.termosAprovados),
  };
}

async function syncProposalDebts(proposalId: string, debitoIds: number[]) {
  await prisma.negotiationProposalDebt.deleteMany({ where: { proposalId } });
  for (const debtId of debitoIds) {
    await prisma.negotiationProposalDebt.create({
      data: { proposalId, debtId },
    });
  }
}

export async function listNegotiationProposals(): Promise<PropostaNegociacao[]> {
  const rows = await prisma.negotiationProposal.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  return rows.map(mapProposalToProposta);
}

export async function findNegotiationProposalById(id: string): Promise<PropostaNegociacao | null> {
  const row = await prisma.negotiationProposal.findUnique({ where: { id } });
  return row ? mapProposalToProposta(row) : null;
}

export async function createNegotiationProposal(item: PropostaNegociacao): Promise<PropostaNegociacao> {
  const row = await prisma.negotiationProposal.create({ data: propostaToData(item) });
  await syncProposalDebts(item.id, item.debitoIds ?? []);
  return mapProposalToProposta(row);
}

export async function updateNegotiationProposal(item: PropostaNegociacao): Promise<PropostaNegociacao> {
  const data = propostaToData(item);
  const row = await prisma.negotiationProposal.update({
    where: { id: item.id },
    data: { ...data, id: undefined },
  });
  await syncProposalDebts(item.id, item.debitoIds ?? []);
  return mapProposalToProposta(row);
}

function parcelaToData(item: ParcelaAcordo) {
  return {
    id: item.id,
    proposalId: item.propostaId,
    condominiumId: item.condominioId,
    unitId: item.unidadeId,
    number: item.numero,
    plannedAmount: decimalFromString(item.valorPrevisto) ?? 0,
    dueDate: dateFromIsoDate(item.vencimentoEm) ?? new Date(),
    createdAt: dateFromIsoDateTime(item.criadoEm) ?? new Date(),
    createdById: item.criadoPorId,
  };
}

export async function listAgreementInstallments(): Promise<ParcelaAcordo[]> {
  const rows = await prisma.agreementInstallment.findMany({
    orderBy: [{ proposalId: "asc" }, { number: "asc" }],
  });
  return rows.map(mapInstallmentToParcela);
}

export async function listAgreementInstallmentsByProposal(proposalId: string): Promise<ParcelaAcordo[]> {
  const rows = await prisma.agreementInstallment.findMany({
    where: { proposalId },
    orderBy: { number: "asc" },
  });
  return rows.map(mapInstallmentToParcela);
}

export async function createAgreementInstallment(item: ParcelaAcordo): Promise<ParcelaAcordo> {
  const row = await prisma.agreementInstallment.create({ data: parcelaToData(item) });
  return mapInstallmentToParcela(row);
}

export async function updateAgreementInstallment(item: ParcelaAcordo): Promise<ParcelaAcordo> {
  const data = parcelaToData(item);
  const row = await prisma.agreementInstallment.update({
    where: { id: item.id },
    data: { ...data, id: undefined },
  });
  return mapInstallmentToParcela(row);
}

function pagamentoToData(item: PagamentoAcordo) {
  return {
    id: item.id,
    proposalId: item.propostaId,
    installmentId: item.parcelaId,
    unitId: item.unidadeId,
    amount: decimalFromString(item.valor) ?? 0,
    paidAt: dateFromIsoDateTime(item.dataPagamento) ?? new Date(),
    proofReference: texto(item.referenciaComprovante),
    confirmation: item.confirmacao,
    createdAt: dateFromIsoDateTime(item.criadoEm) ?? new Date(),
    registeredById: item.registradoPorId,
  };
}

export async function listAgreementPayments(): Promise<PagamentoAcordo[]> {
  const rows = await prisma.agreementPayment.findMany({
    orderBy: [{ paidAt: "asc" }, { id: "asc" }],
  });
  return rows.map(mapPaymentToPagamento);
}

export async function createAgreementPayment(item: PagamentoAcordo): Promise<PagamentoAcordo> {
  const row = await prisma.agreementPayment.create({ data: pagamentoToData(item) });
  return mapPaymentToPagamento(row);
}

export async function findAgreementInstallmentById(id: string): Promise<ParcelaAcordo | null> {
  const row = await prisma.agreementInstallment.findUnique({ where: { id } });
  return row ? mapInstallmentToParcela(row) : null;
}

export async function findAgreementPaymentById(id: string): Promise<PagamentoAcordo | null> {
  const row = await prisma.agreementPayment.findUnique({ where: { id } });
  return row ? mapPaymentToPagamento(row) : null;
}

export async function updateAgreementPayment(item: PagamentoAcordo): Promise<PagamentoAcordo> {
  const data = pagamentoToData(item);
  const row = await prisma.agreementPayment.update({
    where: { id: item.id },
    data: { ...data, id: undefined },
  });
  return mapPaymentToPagamento(row);
}
