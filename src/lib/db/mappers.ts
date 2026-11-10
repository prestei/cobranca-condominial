import type {
  Atendimento,
  AtribuicaoCobranca,
  Auditoria,
  Cargo,
  Condominio,
  Debito,
  DocumentoJuridico,
  EncaminhamentoJuridico,
  Importacao,
  NotificacaoFalha,
  NotificacaoInterna,
  PagamentoAcordo,
  ParcelaAcordo,
  PropostaNegociacao,
  Responsavel,
  Unidade,
  Usuario,
  Vinculo,
} from "@/data/catalogo";
import type {
  AgreementInstallment,
  AgreementPayment,
  AuditLog,
  CollectionAssignment,
  Condominium,
  Debt,
  Import,
  InternalNotification,
  LegalCaseReferral,
  LegalDocument,
  NegotiationProposal,
  NotificationFailure,
  ResponsibleParty,
  Role,
  ServiceTicket,
  Unit,
  UnitResponsibleParty,
  User,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

function money(value: Decimal | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value.toFixed(2);
}

function isoDate(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString().slice(0, 10);
}

function isoDateTime(value: Date | null | undefined): string {
  if (!value) return "";
  return value.toISOString();
}

export function mapRoleToCargo(row: Role): Cargo {
  return {
    id: row.id,
    nome: row.name ?? "",
    descricao: row.description ?? "",
    permissaoJson: row.permissionJson ?? "{}",
    ativo: row.active,
  };
}

export function mapUserToUsuario(row: User): Usuario {
  return {
    id: row.id,
    codigo: row.code,
    ...(row.reCode ? { codigoRe: row.reCode } : {}),
    cargoId: row.roleId ?? 0,
    nome: row.name ?? "",
    telefone: row.phone ?? "",
    email: row.email ?? "",
    senha: row.password ?? "",
    avatar: row.avatar,
    ativo: row.active,
  };
}

export function mapCondominiumToCondominio(row: Condominium): Condominio {
  let advogados: string[] = [];
  try {
    const parsed = JSON.parse(row.lawyersJson ?? "[]");
    advogados = Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    advogados = [];
  }
  return {
    id: row.id,
    nome: row.name ?? "",
    identificadorExterno: row.externalId ?? "",
    status: row.status === "Inativo" ? "Inativo" : "Ativo",
    advogados,
    administradora: row.administrator ?? "",
    estado: row.state ?? "",
    cidade: row.city ?? "",
    cep: row.zipCode ?? "",
    logradouro: row.street ?? "",
    numero: row.number ?? "",
    complemento: row.complement ?? "",
    observacao: row.notes ?? "",
  };
}

export function mapUnitToUnidade(row: Unit): Unidade {
  return {
    id: row.id,
    condominioId: row.condominiumId,
    identificacao: row.identification,
    bloco: row.block ?? "",
    tipo: row.type,
    status: row.status,
    situacao: row.collectionStatus,
  };
}

export function mapResponsibleToResponsavel(row: ResponsibleParty): Responsavel {
  return {
    id: row.id,
    nome: row.name,
    cpfCnpj: row.taxId,
    tipoPessoa: row.personType,
    telefone: row.phone ?? "",
    whatsapp: row.whatsapp ?? "",
    email: row.email ?? "",
    endereco: row.address ?? "",
    observacoes: row.notes ?? "",
  };
}

export function mapUnitLinkToVinculo(row: UnitResponsibleParty): Vinculo {
  return {
    id: row.id,
    unidadeId: row.unitId,
    responsavelId: row.responsiblePartyId,
    tipoVinculo: row.linkType,
    principal: Boolean(row.primary),
    observacoes: row.notes ?? "",
  };
}

export function mapDebtToDebito(row: Debt): Debito {
  return {
    id: row.id,
    condominioId: row.condominiumId,
    unidadeId: row.unitId,
    referencia: row.reference,
    descricao: row.description ?? "",
    dataVencimento: isoDate(row.dueDate),
    valor: money(row.amount),
    valorOriginal: money(row.originalAmount),
    multa: money(row.fine),
    juros: money(row.interest),
    correcao: money(row.correction),
    valorAtualizado: money(row.updatedAmount),
    status: row.status,
    dataPagamento: isoDate(row.paymentDate),
    valorPago: money(row.paidAmount),
    origem: row.origin ?? "",
    identificadorExterno: row.externalId ?? "",
    atualizadoEm: isoDateTime(row.updatedAt),
    fonteValores: row.valueSource === "manual" ? "manual" : "origem",
  };
}

export function mapImportToImportacao(row: Import): Importacao {
  return {
    id: row.id,
    processoId: row.processId ?? undefined,
    origem: row.origin ?? "",
    tipo: row.type,
    arquivo: row.fileName ?? "",
    status: row.status,
    quantidadeRegistros: String(row.recordCount ?? 0),
    quantidadeImportados: String(row.importedCount ?? 0),
    quantidadeAtualizados: String(row.updatedCount ?? 0),
    quantidadeIgnorados: String(row.ignoredCount ?? 0),
    quantidadeErros: String(row.errorCount ?? 0),
    observacaoInterna: row.internalNotes ?? "",
    usuarioId: row.userId,
    iniciadoEm: row.startedAt ? isoDateTime(row.startedAt) : undefined,
    usuarioAprovacaoId: row.approvalUserId,
    aprovadoEm: row.approvedAt ? isoDateTime(row.approvedAt) : null,
    dataImportacao: isoDateTime(row.importedAt),
  };
}

export function mapAuditToAuditoria(row: AuditLog): Auditoria {
  return {
    id: row.id,
    usuarioId: row.userId === null || row.userId === undefined ? "" : String(row.userId),
    entidade: row.entity,
    registroId: row.recordId ?? "",
    acao: row.action,
    dadosAnteriores: row.previousData ?? "",
    dadosNovos: row.newData ?? "",
    camposAlterados: row.changedFields ?? "",
    ip: row.ip ?? "",
    userAgent: row.userAgent ?? "",
    dataHora: isoDateTime(row.occurredAt),
  };
}

export function mapAssignmentToAtribuicao(row: CollectionAssignment): AtribuicaoCobranca {
  return {
    id: row.id,
    unidadeId: row.unitId,
    atendenteId: row.attendantId,
    atribuidoPorId: row.assignedById,
    atribuidoEm: isoDateTime(row.assignedAt),
    encerradoEm: row.closedAt ? isoDateTime(row.closedAt) : null,
    motivo: row.reason ?? "",
    anteriorAtendenteId: row.previousAttendantId,
  };
}

export function mapTicketToAtendimento(row: ServiceTicket): Atendimento {
  return {
    id: row.id,
    unidadeId: String(row.unitId),
    responsavelId: row.responsiblePartyId === null || row.responsiblePartyId === undefined ? "" : String(row.responsiblePartyId),
    usuarioId: row.userId,
    dataHora: isoDateTime(row.occurredAt),
    canal: row.channel ?? "",
    respondeu: row.answered ?? "",
    motivo: row.reason ?? "",
    assunto: row.subject ?? "",
    descricao: row.description ?? "",
    status: row.status,
    dataProximaAcao: row.nextActionAt ? isoDateTime(row.nextActionAt) : "",
    proximaAcao: row.nextAction ?? "",
    retornoConcluidoEm: row.returnCompletedAt ? isoDateTime(row.returnCompletedAt) : "",
    retornoConcluidoPorId: row.returnCompletedById,
  };
}

function parseDebtIds(raw: string | null | undefined): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(Number).filter((n) => Number.isFinite(n));
  } catch {
    return [];
  }
}

export function mapProposalToProposta(row: NegotiationProposal): PropostaNegociacao {
  return {
    id: row.id,
    condominioId: row.condominiumId,
    unidadeId: row.unitId,
    usuarioId: row.userId,
    criadoEm: isoDateTime(row.createdAt),
    status: row.status,
    valorProposto: money(row.proposedAmount),
    observacoes: row.notes ?? "",
    debitoIds: parseDebtIds(row.debtIdsJson),
    acordoConfirmadoEm: row.agreementConfirmedAt ? isoDateTime(row.agreementConfirmedAt) : "",
    acordoConfirmadoPorId: row.agreementConfirmedById,
    termosAprovados: row.approvedTerms ?? "",
  };
}

export function mapInstallmentToParcela(row: AgreementInstallment): ParcelaAcordo {
  return {
    id: row.id,
    propostaId: row.proposalId,
    condominioId: row.condominiumId,
    unidadeId: row.unitId,
    numero: row.number,
    valorPrevisto: money(row.plannedAmount),
    vencimentoEm: isoDate(row.dueDate),
    criadoEm: isoDateTime(row.createdAt),
    criadoPorId: row.createdById,
  };
}

export function mapPaymentToPagamento(row: AgreementPayment): PagamentoAcordo {
  return {
    id: row.id,
    propostaId: row.proposalId,
    parcelaId: row.installmentId,
    unidadeId: row.unitId,
    valor: money(row.amount),
    dataPagamento: isoDateTime(row.paidAt),
    referenciaComprovante: row.proofReference ?? "",
    confirmacao: row.confirmation,
    criadoEm: isoDateTime(row.createdAt),
    registradoPorId: row.registeredById,
  };
}

export function mapReferralToEncaminhamento(row: LegalCaseReferral): EncaminhamentoJuridico {
  return {
    id: row.id,
    condominioId: row.condominiumId,
    unidadeId: row.unitId,
    usuarioId: row.userId,
    encaminhadoEm: isoDateTime(row.referredAt),
    status: row.status,
    advogadoResponsavel: row.lawyerName,
    observacoes: row.notes ?? "",
    debitoIds: parseDebtIds(row.debtIdsJson),
    resumoContexto: row.contextSummary ?? "",
    atualizadoEm: isoDateTime(row.updatedAt),
    atualizadoPorId: row.updatedById,
  };
}

export function mapLegalDocToDocumento(row: LegalDocument): DocumentoJuridico {
  return {
    id: row.id,
    encaminhamentoId: row.referralId,
    titulo: row.title,
    descricao: row.description ?? "",
    referenciaArquivo: row.fileReference ?? "",
    registradoEm: isoDateTime(row.registeredAt),
    registradoPorId: row.registeredById,
  };
}

export function mapNotificationToNotificacao(row: InternalNotification): NotificacaoInterna {
  return {
    id: row.id,
    chaveIdempotencia: row.idempotencyKey,
    evento: row.event as NotificacaoInterna["evento"],
    destinatarioId: row.recipientId,
    titulo: row.title,
    descricao: row.description ?? "",
    entidadeTipo: row.entityType as NotificacaoInterna["entidadeTipo"],
    registroId: row.recordId,
    unidadeId: row.unitId ?? 0,
    condominioId: row.condominiumId,
    criadoEm: isoDateTime(row.createdAt),
    lidaEm: row.readAt ? isoDateTime(row.readAt) : null,
  };
}

export function mapNotificationFailureToFalha(row: NotificationFailure): NotificacaoFalha {
  return {
    id: row.id,
    chaveIdempotencia: row.idempotencyKey,
    evento: row.event,
    destinatarioId: row.recipientId,
    erro: row.error,
    ocorridoEm: isoDateTime(row.occurredAt),
  };
}

export function decimalFromString(value: string | number | null | undefined): Decimal | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return new Decimal(n.toFixed(2));
}

export function dateFromIsoDate(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const raw = value.includes("T") ? value.slice(0, 10) : value.slice(0, 10);
  const d = new Date(`${raw}T12:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function dateFromIsoDateTime(value: string | null | undefined): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
