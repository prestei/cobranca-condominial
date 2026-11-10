import { DocumentoJuridico, EncaminhamentoJuridico } from "@/data/catalogo";
import { prisma } from "@/lib/db/prisma";
import { dateFromIsoDateTime, mapLegalDocToDocumento, mapReferralToEncaminhamento } from "@/lib/db/mappers";

function texto(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function encaminhamentoToData(item: EncaminhamentoJuridico) {
  return {
    id: item.id,
    condominiumId: item.condominioId,
    unitId: item.unidadeId,
    userId: item.usuarioId,
    referredAt: dateFromIsoDateTime(item.encaminhadoEm) ?? new Date(),
    status: item.status,
    lawyerName: item.advogadoResponsavel,
    notes: texto(item.observacoes),
    debtIdsJson: JSON.stringify(item.debitoIds ?? []),
    contextSummary: texto(item.resumoContexto),
    updatedAt: dateFromIsoDateTime(item.atualizadoEm) ?? new Date(),
    updatedById: item.atualizadoPorId,
  };
}

function documentoToData(item: DocumentoJuridico) {
  return {
    id: item.id,
    referralId: item.encaminhamentoId,
    title: item.titulo,
    description: texto(item.descricao),
    fileReference: texto(item.referenciaArquivo),
    registeredAt: dateFromIsoDateTime(item.registradoEm) ?? new Date(),
    registeredById: item.registradoPorId,
  };
}

export async function listLegalReferrals(): Promise<EncaminhamentoJuridico[]> {
  const rows = await prisma.legalCaseReferral.findMany({
    orderBy: [{ referredAt: "asc" }, { id: "asc" }],
  });
  return rows.map(mapReferralToEncaminhamento);
}

export async function findLegalReferralById(id: string): Promise<EncaminhamentoJuridico | null> {
  const row = await prisma.legalCaseReferral.findUnique({ where: { id } });
  return row ? mapReferralToEncaminhamento(row) : null;
}

export async function createLegalReferral(item: EncaminhamentoJuridico): Promise<EncaminhamentoJuridico> {
  const row = await prisma.legalCaseReferral.create({ data: encaminhamentoToData(item) });
  return mapReferralToEncaminhamento(row);
}

export async function updateLegalReferral(item: EncaminhamentoJuridico): Promise<EncaminhamentoJuridico> {
  const data = encaminhamentoToData(item);
  const row = await prisma.legalCaseReferral.update({
    where: { id: item.id },
    data: { ...data, id: undefined },
  });
  return mapReferralToEncaminhamento(row);
}

export async function listLegalDocuments(): Promise<DocumentoJuridico[]> {
  const rows = await prisma.legalDocument.findMany({
    orderBy: [{ registeredAt: "asc" }, { id: "asc" }],
  });
  return rows.map(mapLegalDocToDocumento);
}

export async function listLegalDocumentsByReferral(referralId: string): Promise<DocumentoJuridico[]> {
  const rows = await prisma.legalDocument.findMany({
    where: { referralId },
    orderBy: { registeredAt: "asc" },
  });
  return rows.map(mapLegalDocToDocumento);
}

export async function createLegalDocument(item: DocumentoJuridico): Promise<DocumentoJuridico> {
  const row = await prisma.legalDocument.create({ data: documentoToData(item) });
  return mapLegalDocToDocumento(row);
}
