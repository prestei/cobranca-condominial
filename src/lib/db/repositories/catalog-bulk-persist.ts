import { Atendimento, AtribuicaoCobranca, Auditoria, Cadastros, Condominio, Debito, DocumentoJuridico, EncaminhamentoJuridico, Importacao, NotificacaoFalha, NotificacaoInterna, PagamentoAcordo, ParcelaAcordo, PropostaNegociacao, Responsavel, Unidade, Usuario, Vinculo, Cargo } from "@/data/catalogo";
import { dateFromIsoDate, dateFromIsoDateTime, decimalFromString } from "@/lib/db/mappers";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

type Tx = Prisma.TransactionClient;

const INCREMENT_TABLES = [
  "role",
  "user",
  "condominium",
  "unit",
  "responsible_party",
  "unit_responsible_party",
  "debt",
  "import",
  "audit_log",
  "collection_assignment",
  "internal_notification",
  "notification_failure",
] as const;

type IncrementTable = (typeof INCREMENT_TABLES)[number];

function databaseUrlConfigured(): string | null {
  const url = process.env.DATABASE_URL?.trim();
  return url || null;
}

function intOrNull(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function trimText(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function requiredDueDate(value: string | null | undefined): Date {
  return dateFromIsoDate(value) ?? new Date("1970-01-01T12:00:00.000Z");
}

function requiredDateTime(value: string | null | undefined): Date {
  return dateFromIsoDateTime(value) ?? new Date();
}

async function bumpAutoIncrementSequence(tx: Tx, table: IncrementTable, column = "id"): Promise<void> {
  const tableSql = table === "user" ? `"user"` : table;
  const seqTable = table === "user" ? "user" : table;
  await tx.$executeRawUnsafe(
    `SELECT setval(
       pg_get_serial_sequence($1, $2),
       GREATEST(COALESCE((SELECT MAX(${column}) FROM ${tableSql}), 1), 1),
       true
     )`,
    seqTable,
    column,
  );
}

async function bumpSequences(tx: Tx, tables: readonly IncrementTable[]): Promise<void> {
  for (const table of tables) {
    await bumpAutoIncrementSequence(tx, table);
  }
}

/** Contagem de entidades operacionais usadas para detectar catálogo “vazio”. */
export function contagemOperacionalCatalogo(
  cadastros: Partial<
    Pick<
      Cadastros,
      | "condominios"
      | "unidades"
      | "responsaveis"
      | "vinculos"
      | "debitos"
      | "atendimentos"
      | "importacoes"
      | "atribuicoesCobranca"
      | "propostasNegociacao"
      | "parcelasAcordo"
      | "pagamentosAcordo"
      | "encaminhamentosJuridicos"
      | "documentosJuridicos"
      | "notificacoesInternas"
    >
  >,
): number {
  return (
    (cadastros.condominios?.length ?? 0) +
    (cadastros.unidades?.length ?? 0) +
    (cadastros.responsaveis?.length ?? 0) +
    (cadastros.vinculos?.length ?? 0) +
    (cadastros.debitos?.length ?? 0) +
    (cadastros.atendimentos?.length ?? 0) +
    (cadastros.importacoes?.length ?? 0) +
    (cadastros.atribuicoesCobranca?.length ?? 0) +
    (cadastros.propostasNegociacao?.length ?? 0) +
    (cadastros.parcelasAcordo?.length ?? 0) +
    (cadastros.pagamentosAcordo?.length ?? 0) +
    (cadastros.encaminhamentosJuridicos?.length ?? 0) +
    (cadastros.documentosJuridicos?.length ?? 0) +
    (cadastros.notificacoesInternas?.length ?? 0)
  );
}

export function catalogoOperacionalVazio(
  cadastros: Parameters<typeof contagemOperacionalCatalogo>[0] | null | undefined,
): boolean {
  if (!cadastros) return true;
  return contagemOperacionalCatalogo(cadastros) === 0;
}

export async function postgresCatalogoDisponivel(): Promise<boolean> {
  if (!databaseUrlConfigured()) return false;
  try {
    const rows = await prisma.$queryRaw<
      Array<{ debt: string | null; import: string | null; service_ticket: string | null; app_setting: string | null }>
    >`
      SELECT
        to_regclass('public.debt') AS debt,
        to_regclass('public.import') AS import,
        to_regclass('public.service_ticket') AS service_ticket,
        to_regclass('public.app_setting') AS app_setting
    `;
    const row = rows[0];
    return Boolean(row?.debt && row?.import && row?.service_ticket && row?.app_setting);
  } catch {
    return false;
  }
}

export async function contagemLinhasOperacionaisDb(): Promise<number> {
  const [
    condominium,
    unit,
    debt,
    imp,
    serviceTicket,
    collectionAssignment,
    negotiationProposal,
    legalCaseReferral,
    internalNotification,
  ] = await Promise.all([
    prisma.condominium.count(),
    prisma.unit.count(),
    prisma.debt.count(),
    prisma.import.count(),
    prisma.serviceTicket.count(),
    prisma.collectionAssignment.count(),
    prisma.negotiationProposal.count(),
    prisma.legalCaseReferral.count(),
    prisma.internalNotification.count(),
  ]);
  return (
    condominium +
    unit +
    debt +
    imp +
    serviceTicket +
    collectionAssignment +
    negotiationProposal +
    legalCaseReferral +
    internalNotification
  );
}

async function upsertRolesAndUsers(tx: Tx, cargos: Cargo[], usuarios: Usuario[]): Promise<void> {
  for (const cargo of cargos) {
    await tx.role.upsert({
      where: { id: cargo.id },
      create: {
        id: cargo.id,
        name: cargo.nome,
        description: cargo.descricao ?? "",
        permissionJson: cargo.permissaoJson ?? "{}",
        active: cargo.ativo !== false,
      },
      update: {
        name: cargo.nome,
        description: cargo.descricao ?? "",
        permissionJson: cargo.permissaoJson ?? "{}",
        active: cargo.ativo !== false,
      },
    });
  }

  for (const usuario of usuarios) {
    const base = {
      code: usuario.codigo,
      reCode: trimText(usuario.codigoRe),
      roleId: usuario.cargoId,
      name: usuario.nome,
      phone: trimText(usuario.telefone),
      email: trimText(usuario.email),
      avatar: trimText(usuario.avatar ?? undefined),
      active: usuario.ativo !== false,
    };
    await tx.user.upsert({
      where: { id: usuario.id },
      create: {
        id: usuario.id,
        ...base,
        password: usuario.senha || null,
      },
      update: {
        ...base,
        ...(usuario.senha ? { password: usuario.senha } : {}),
      },
    });
  }

  await bumpSequences(tx, ["role", "user"]);
}

async function upsertCondominiums(tx: Tx, condominios: Condominio[]): Promise<void> {
  for (const item of condominios) {
    await tx.condominium.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        name: item.nome,
        externalId: trimText(item.identificadorExterno),
        status: item.status,
        lawyersJson: JSON.stringify(item.advogados ?? []),
        administrator: trimText(item.administradora),
        state: trimText(item.estado),
        city: trimText(item.cidade),
        zipCode: trimText(item.cep),
        street: trimText(item.logradouro),
        number: trimText(item.numero),
        complement: trimText(item.complemento),
        notes: trimText(item.observacao),
      },
      update: {
        name: item.nome,
        externalId: trimText(item.identificadorExterno),
        status: item.status,
        lawyersJson: JSON.stringify(item.advogados ?? []),
        administrator: trimText(item.administradora),
        state: trimText(item.estado),
        city: trimText(item.cidade),
        zipCode: trimText(item.cep),
        street: trimText(item.logradouro),
        number: trimText(item.numero),
        complement: trimText(item.complemento),
        notes: trimText(item.observacao),
      },
    });
  }
  await bumpAutoIncrementSequence(tx, "condominium");
}

async function upsertUnits(tx: Tx, unidades: Unidade[]): Promise<void> {
  for (const item of unidades) {
    await tx.unit.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        condominiumId: item.condominioId,
        identification: item.identificacao,
        block: trimText(item.bloco),
        type: item.tipo,
        status: item.status,
        collectionStatus: item.situacao,
      },
      update: {
        condominiumId: item.condominioId,
        identification: item.identificacao,
        block: trimText(item.bloco),
        type: item.tipo,
        status: item.status,
        collectionStatus: item.situacao,
      },
    });
  }
  await bumpAutoIncrementSequence(tx, "unit");
}

async function upsertResponsibleParties(tx: Tx, responsaveis: Responsavel[]): Promise<void> {
  for (const item of responsaveis) {
    await tx.responsibleParty.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        name: item.nome,
        taxId: item.cpfCnpj,
        personType: item.tipoPessoa,
        phone: trimText(item.telefone),
        whatsapp: trimText(item.whatsapp),
        email: trimText(item.email),
        address: trimText(item.endereco),
        notes: trimText(item.observacoes),
      },
      update: {
        name: item.nome,
        taxId: item.cpfCnpj,
        personType: item.tipoPessoa,
        phone: trimText(item.telefone),
        whatsapp: trimText(item.whatsapp),
        email: trimText(item.email),
        address: trimText(item.endereco),
        notes: trimText(item.observacoes),
      },
    });
  }
  await bumpAutoIncrementSequence(tx, "responsible_party");
}

async function upsertUnitLinks(tx: Tx, vinculos: Vinculo[]): Promise<void> {
  for (const item of vinculos) {
    await tx.unitResponsibleParty.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        unitId: item.unidadeId,
        responsiblePartyId: item.responsavelId,
        linkType: item.tipoVinculo,
        primary: Boolean(item.principal),
        notes: trimText(item.observacoes),
      },
      update: {
        unitId: item.unidadeId,
        responsiblePartyId: item.responsavelId,
        linkType: item.tipoVinculo,
        primary: Boolean(item.principal),
        notes: trimText(item.observacoes),
      },
    });
  }
  await bumpAutoIncrementSequence(tx, "unit_responsible_party");
}

async function upsertDebts(tx: Tx, debitos: Debito[]): Promise<void> {
  for (const item of debitos) {
    await tx.debt.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        condominiumId: item.condominioId,
        unitId: item.unidadeId,
        reference: item.referencia,
        description: trimText(item.descricao),
        dueDate: requiredDueDate(item.dataVencimento),
        amount: decimalFromString(item.valor),
        originalAmount: decimalFromString(item.valorOriginal),
        fine: decimalFromString(item.multa),
        interest: decimalFromString(item.juros),
        correction: decimalFromString(item.correcao),
        updatedAmount: decimalFromString(item.valorAtualizado),
        status: item.status,
        paymentDate: dateFromIsoDate(item.dataPagamento),
        paidAmount: decimalFromString(item.valorPago),
        origin: trimText(item.origem),
        externalId: trimText(item.identificadorExterno),
        updatedAt: dateFromIsoDateTime(item.atualizadoEm),
        valueSource: item.fonteValores,
      },
      update: {
        condominiumId: item.condominioId,
        unitId: item.unidadeId,
        reference: item.referencia,
        description: trimText(item.descricao),
        dueDate: requiredDueDate(item.dataVencimento),
        amount: decimalFromString(item.valor),
        originalAmount: decimalFromString(item.valorOriginal),
        fine: decimalFromString(item.multa),
        interest: decimalFromString(item.juros),
        correction: decimalFromString(item.correcao),
        updatedAmount: decimalFromString(item.valorAtualizado),
        status: item.status,
        paymentDate: dateFromIsoDate(item.dataPagamento),
        paidAmount: decimalFromString(item.valorPago),
        origin: trimText(item.origem),
        externalId: trimText(item.identificadorExterno),
        updatedAt: dateFromIsoDateTime(item.atualizadoEm),
        valueSource: item.fonteValores,
      },
    });
  }
  await bumpAutoIncrementSequence(tx, "debt");
}

async function upsertImports(tx: Tx, importacoes: Importacao[]): Promise<void> {
  for (const item of importacoes) {
    await tx.import.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        processId: trimText(item.processoId),
        origin: trimText(item.origem),
        type: item.tipo,
        fileName: trimText(item.arquivo),
        status: item.status,
        recordCount: intOrNull(item.quantidadeRegistros),
        importedCount: intOrNull(item.quantidadeImportados),
        updatedCount: intOrNull(item.quantidadeAtualizados),
        ignoredCount: intOrNull(item.quantidadeIgnorados),
        errorCount: intOrNull(item.quantidadeErros),
        internalNotes: trimText(item.observacaoInterna),
        userId: item.usuarioId,
        startedAt: dateFromIsoDateTime(item.iniciadoEm),
        approvalUserId: item.usuarioAprovacaoId ?? null,
        approvedAt: dateFromIsoDateTime(item.aprovadoEm ?? undefined),
        importedAt: requiredDateTime(item.dataImportacao),
      },
      update: {
        processId: trimText(item.processoId),
        origin: trimText(item.origem),
        type: item.tipo,
        fileName: trimText(item.arquivo),
        status: item.status,
        recordCount: intOrNull(item.quantidadeRegistros),
        importedCount: intOrNull(item.quantidadeImportados),
        updatedCount: intOrNull(item.quantidadeAtualizados),
        ignoredCount: intOrNull(item.quantidadeIgnorados),
        errorCount: intOrNull(item.quantidadeErros),
        internalNotes: trimText(item.observacaoInterna),
        userId: item.usuarioId,
        startedAt: dateFromIsoDateTime(item.iniciadoEm),
        approvalUserId: item.usuarioAprovacaoId ?? null,
        approvedAt: dateFromIsoDateTime(item.aprovadoEm ?? undefined),
        importedAt: requiredDateTime(item.dataImportacao),
      },
    });
  }
  await bumpAutoIncrementSequence(tx, "import");
}

async function upsertAuditLogs(tx: Tx, auditoria: Auditoria[]): Promise<void> {
  if (auditoria.length === 0) return;
  await tx.auditLog.createMany({
    data: auditoria.map((item) => ({
      id: item.id,
      userId: intOrNull(item.usuarioId),
      entity: item.entidade,
      recordId: trimText(item.registroId),
      action: item.acao,
      previousData: trimText(item.dadosAnteriores),
      newData: trimText(item.dadosNovos),
      changedFields: trimText(item.camposAlterados),
      ip: trimText(item.ip),
      userAgent: trimText(item.userAgent),
      occurredAt: requiredDateTime(item.dataHora),
    })),
    skipDuplicates: true,
  });
  await bumpAutoIncrementSequence(tx, "audit_log");
}

async function upsertCollectionAssignments(tx: Tx, itens: AtribuicaoCobranca[]): Promise<void> {
  for (const item of itens) {
    await tx.collectionAssignment.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        unitId: item.unidadeId,
        attendantId: item.atendenteId,
        assignedById: item.atribuidoPorId,
        assignedAt: requiredDateTime(item.atribuidoEm),
        closedAt: dateFromIsoDateTime(item.encerradoEm ?? undefined),
        reason: trimText(item.motivo),
        previousAttendantId: item.anteriorAtendenteId,
      },
      update: {
        unitId: item.unidadeId,
        attendantId: item.atendenteId,
        assignedById: item.atribuidoPorId,
        assignedAt: requiredDateTime(item.atribuidoEm),
        closedAt: dateFromIsoDateTime(item.encerradoEm ?? undefined),
        reason: trimText(item.motivo),
        previousAttendantId: item.anteriorAtendenteId,
      },
    });
  }
  await bumpAutoIncrementSequence(tx, "collection_assignment");
}

async function upsertServiceTickets(tx: Tx, itens: Atendimento[]): Promise<void> {
  for (const item of itens) {
    const unitId = intOrNull(item.unidadeId);
    if (unitId === null) continue;
    await tx.serviceTicket.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        unitId,
        responsiblePartyId: item.responsavelId ? intOrNull(item.responsavelId) : null,
        userId: item.usuarioId,
        occurredAt: requiredDateTime(item.dataHora),
        channel: trimText(item.canal),
        answered: trimText(item.respondeu),
        reason: trimText(item.motivo),
        subject: trimText(item.assunto),
        description: trimText(item.descricao),
        status: item.status,
        nextActionAt: dateFromIsoDateTime(trimText(item.dataProximaAcao) ?? undefined),
        nextAction: trimText(item.proximaAcao),
        returnCompletedAt: dateFromIsoDateTime(trimText(item.retornoConcluidoEm) ?? undefined),
        returnCompletedById: item.retornoConcluidoPorId,
      },
      update: {
        unitId,
        responsiblePartyId: item.responsavelId ? intOrNull(item.responsavelId) : null,
        userId: item.usuarioId,
        occurredAt: requiredDateTime(item.dataHora),
        channel: trimText(item.canal),
        answered: trimText(item.respondeu),
        reason: trimText(item.motivo),
        subject: trimText(item.assunto),
        description: trimText(item.descricao),
        status: item.status,
        nextActionAt: dateFromIsoDateTime(trimText(item.dataProximaAcao) ?? undefined),
        nextAction: trimText(item.proximaAcao),
        returnCompletedAt: dateFromIsoDateTime(trimText(item.retornoConcluidoEm) ?? undefined),
        returnCompletedById: item.retornoConcluidoPorId,
      },
    });
  }
}

async function upsertNegotiationProposals(tx: Tx, itens: PropostaNegociacao[]): Promise<void> {
  for (const item of itens) {
    await tx.negotiationProposal.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        condominiumId: item.condominioId,
        unitId: item.unidadeId,
        userId: item.usuarioId,
        createdAt: requiredDateTime(item.criadoEm),
        status: item.status,
        proposedAmount: decimalFromString(item.valorProposto) ?? new Decimal(0),
        notes: trimText(item.observacoes),
        debtIdsJson: JSON.stringify(item.debitoIds ?? []),
        agreementConfirmedAt: dateFromIsoDateTime(trimText(item.acordoConfirmadoEm) ?? undefined),
        agreementConfirmedById: item.acordoConfirmadoPorId,
        approvedTerms: trimText(item.termosAprovados),
      },
      update: {
        condominiumId: item.condominioId,
        unitId: item.unidadeId,
        userId: item.usuarioId,
        createdAt: requiredDateTime(item.criadoEm),
        status: item.status,
        proposedAmount: decimalFromString(item.valorProposto) ?? new Decimal(0),
        notes: trimText(item.observacoes),
        debtIdsJson: JSON.stringify(item.debitoIds ?? []),
        agreementConfirmedAt: dateFromIsoDateTime(trimText(item.acordoConfirmadoEm) ?? undefined),
        agreementConfirmedById: item.acordoConfirmadoPorId,
        approvedTerms: trimText(item.termosAprovados),
      },
    });

    const debitoIds = item.debitoIds ?? [];
    await tx.negotiationProposalDebt.deleteMany({ where: { proposalId: item.id } });
    for (const debtId of debitoIds) {
      await tx.negotiationProposalDebt.create({
        data: { proposalId: item.id, debtId },
      });
    }
  }
}

async function upsertAgreementInstallments(tx: Tx, itens: ParcelaAcordo[]): Promise<void> {
  for (const item of itens) {
    await tx.agreementInstallment.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        proposalId: item.propostaId,
        condominiumId: item.condominioId,
        unitId: item.unidadeId,
        number: item.numero,
        plannedAmount: decimalFromString(item.valorPrevisto) ?? new Decimal(0),
        dueDate: requiredDueDate(item.vencimentoEm),
        createdAt: requiredDateTime(item.criadoEm),
        createdById: item.criadoPorId,
      },
      update: {
        proposalId: item.propostaId,
        condominiumId: item.condominioId,
        unitId: item.unidadeId,
        number: item.numero,
        plannedAmount: decimalFromString(item.valorPrevisto) ?? new Decimal(0),
        dueDate: requiredDueDate(item.vencimentoEm),
        createdAt: requiredDateTime(item.criadoEm),
        createdById: item.criadoPorId,
      },
    });
  }
}

async function upsertAgreementPayments(tx: Tx, itens: PagamentoAcordo[]): Promise<void> {
  for (const item of itens) {
    await tx.agreementPayment.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        proposalId: item.propostaId,
        installmentId: item.parcelaId,
        unitId: item.unidadeId,
        amount: decimalFromString(item.valor) ?? new Decimal(0),
        paidAt: requiredDateTime(item.dataPagamento),
        proofReference: trimText(item.referenciaComprovante),
        confirmation: item.confirmacao,
        createdAt: requiredDateTime(item.criadoEm),
        registeredById: item.registradoPorId,
      },
      update: {
        proposalId: item.propostaId,
        installmentId: item.parcelaId,
        unitId: item.unidadeId,
        amount: decimalFromString(item.valor) ?? new Decimal(0),
        paidAt: requiredDateTime(item.dataPagamento),
        proofReference: trimText(item.referenciaComprovante),
        confirmation: item.confirmacao,
        createdAt: requiredDateTime(item.criadoEm),
        registeredById: item.registradoPorId,
      },
    });
  }
}

async function upsertLegalReferrals(tx: Tx, itens: EncaminhamentoJuridico[]): Promise<void> {
  for (const item of itens) {
    await tx.legalCaseReferral.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        condominiumId: item.condominioId,
        unitId: item.unidadeId,
        userId: item.usuarioId,
        referredAt: requiredDateTime(item.encaminhadoEm),
        status: item.status,
        lawyerName: item.advogadoResponsavel,
        notes: trimText(item.observacoes),
        debtIdsJson: JSON.stringify(item.debitoIds ?? []),
        contextSummary: trimText(item.resumoContexto),
        updatedAt: requiredDateTime(item.atualizadoEm),
        updatedById: item.atualizadoPorId,
      },
      update: {
        condominiumId: item.condominioId,
        unitId: item.unidadeId,
        userId: item.usuarioId,
        referredAt: requiredDateTime(item.encaminhadoEm),
        status: item.status,
        lawyerName: item.advogadoResponsavel,
        notes: trimText(item.observacoes),
        debtIdsJson: JSON.stringify(item.debitoIds ?? []),
        contextSummary: trimText(item.resumoContexto),
        updatedAt: requiredDateTime(item.atualizadoEm),
        updatedById: item.atualizadoPorId,
      },
    });
  }
}

async function upsertLegalDocuments(tx: Tx, itens: DocumentoJuridico[]): Promise<void> {
  for (const item of itens) {
    await tx.legalDocument.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        referralId: item.encaminhamentoId,
        title: item.titulo,
        description: trimText(item.descricao),
        fileReference: trimText(item.referenciaArquivo),
        registeredAt: requiredDateTime(item.registradoEm),
        registeredById: item.registradoPorId,
      },
      update: {
        referralId: item.encaminhamentoId,
        title: item.titulo,
        description: trimText(item.descricao),
        fileReference: trimText(item.referenciaArquivo),
        registeredAt: requiredDateTime(item.registradoEm),
        registeredById: item.registradoPorId,
      },
    });
  }
}

async function upsertInternalNotifications(tx: Tx, itens: NotificacaoInterna[]): Promise<void> {
  for (const item of itens) {
    await tx.internalNotification.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        idempotencyKey: item.chaveIdempotencia,
        event: item.evento,
        recipientId: item.destinatarioId,
        title: item.titulo,
        description: trimText(item.descricao),
        entityType: item.entidadeTipo,
        recordId: item.registroId,
        unitId: item.unidadeId || null,
        condominiumId: item.condominioId,
        createdAt: requiredDateTime(item.criadoEm),
        readAt: dateFromIsoDateTime(item.lidaEm ?? undefined),
      },
      update: {
        idempotencyKey: item.chaveIdempotencia,
        event: item.evento,
        recipientId: item.destinatarioId,
        title: item.titulo,
        description: trimText(item.descricao),
        entityType: item.entidadeTipo,
        recordId: item.registroId,
        unitId: item.unidadeId || null,
        condominiumId: item.condominioId,
        createdAt: requiredDateTime(item.criadoEm),
        readAt: dateFromIsoDateTime(item.lidaEm ?? undefined),
      },
    });
  }
  await bumpAutoIncrementSequence(tx, "internal_notification");
}

async function upsertNotificationFailures(tx: Tx, itens: NotificacaoFalha[]): Promise<void> {
  for (const item of itens) {
    await tx.notificationFailure.upsert({
      where: { id: item.id },
      create: {
        id: item.id,
        idempotencyKey: item.chaveIdempotencia,
        event: item.evento,
        recipientId: item.destinatarioId,
        error: item.erro,
        occurredAt: requiredDateTime(item.ocorridoEm),
      },
      update: {
        idempotencyKey: item.chaveIdempotencia,
        event: item.evento,
        recipientId: item.destinatarioId,
        error: item.erro,
        occurredAt: requiredDateTime(item.ocorridoEm),
      },
    });
  }
  await bumpAutoIncrementSequence(tx, "notification_failure");
}

async function deleteIntOrphans(tx: Tx, model: "notificationFailure" | "internalNotification" | "collectionAssignment" | "auditLog" | "import" | "debt" | "unitResponsibleParty" | "responsibleParty" | "unit" | "condominium", ids: number[]): Promise<void> {
  const where = ids.length === 0 ? undefined : { id: { notIn: ids } };
  switch (model) {
    case "notificationFailure":
      await tx.notificationFailure.deleteMany({ where });
      break;
    case "internalNotification":
      await tx.internalNotification.deleteMany({ where });
      break;
    case "collectionAssignment":
      await tx.collectionAssignment.deleteMany({ where });
      break;
    case "auditLog":
      await tx.auditLog.deleteMany({ where });
      break;
    case "import":
      await tx.import.deleteMany({ where });
      break;
    case "debt":
      await tx.debt.deleteMany({ where });
      break;
    case "unitResponsibleParty":
      await tx.unitResponsibleParty.deleteMany({ where });
      break;
    case "responsibleParty":
      await tx.responsibleParty.deleteMany({ where });
      break;
    case "unit":
      await tx.unit.deleteMany({ where });
      break;
    case "condominium":
      await tx.condominium.deleteMany({ where });
      break;
    default:
      break;
  }
}

async function deleteStringOrphans(
  tx: Tx,
  model:
    | "agreementPayment"
    | "legalDocument"
    | "agreementInstallment"
    | "negotiationProposal"
    | "legalCaseReferral"
    | "serviceTicket",
  ids: string[],
): Promise<void> {
  const where = ids.length === 0 ? undefined : { id: { notIn: ids } };
  switch (model) {
    case "agreementPayment":
      await tx.agreementPayment.deleteMany({ where });
      break;
    case "legalDocument":
      await tx.legalDocument.deleteMany({ where });
      break;
    case "agreementInstallment":
      await tx.agreementInstallment.deleteMany({ where });
      break;
    case "negotiationProposal":
      await tx.negotiationProposal.deleteMany({ where });
      break;
    case "legalCaseReferral":
      await tx.legalCaseReferral.deleteMany({ where });
      break;
    case "serviceTicket":
      await tx.serviceTicket.deleteMany({ where });
      break;
    default:
      break;
  }
}

async function syncOrphans(tx: Tx, cadastros: Cadastros): Promise<void> {
  const proposalIds = cadastros.propostasNegociacao.map((x) => x.id);
  if (proposalIds.length === 0) {
    await tx.negotiationProposalDebt.deleteMany();
  } else {
    await tx.negotiationProposalDebt.deleteMany({
      where: { proposalId: { notIn: proposalIds } },
    });
  }

  await deleteIntOrphans(tx, "notificationFailure", cadastros.notificacaoFalhas.map((x) => x.id));
  await deleteIntOrphans(tx, "internalNotification", cadastros.notificacoesInternas.map((x) => x.id));
  await deleteStringOrphans(tx, "agreementPayment", cadastros.pagamentosAcordo.map((x) => x.id));
  await deleteStringOrphans(tx, "legalDocument", cadastros.documentosJuridicos.map((x) => x.id));
  await deleteStringOrphans(tx, "agreementInstallment", cadastros.parcelasAcordo.map((x) => x.id));
  await deleteStringOrphans(tx, "negotiationProposal", proposalIds);
  await deleteStringOrphans(tx, "legalCaseReferral", cadastros.encaminhamentosJuridicos.map((x) => x.id));
  await deleteStringOrphans(tx, "serviceTicket", cadastros.atendimentos.map((x) => x.id));
  await deleteIntOrphans(tx, "collectionAssignment", cadastros.atribuicoesCobranca.map((x) => x.id));
  await deleteIntOrphans(tx, "auditLog", cadastros.auditoria.map((x) => x.id));
  await deleteIntOrphans(tx, "import", cadastros.importacoes.map((x) => x.id));
  await deleteIntOrphans(tx, "debt", cadastros.debitos.map((x) => x.id));
  await deleteIntOrphans(tx, "unitResponsibleParty", cadastros.vinculos.map((x) => x.id));
  await deleteIntOrphans(tx, "responsibleParty", cadastros.responsaveis.map((x) => x.id));
  await deleteIntOrphans(tx, "unit", cadastros.unidades.map((x) => x.id));
  await deleteIntOrphans(tx, "condominium", cadastros.condominios.map((x) => x.id));
}

async function persistCatalogInTransaction(tx: Tx, cadastros: Cadastros): Promise<void> {
  await upsertRolesAndUsers(tx, cadastros.cargos, cadastros.usuarios);
  await upsertCondominiums(tx, cadastros.condominios);
  await upsertUnits(tx, cadastros.unidades);
  await upsertResponsibleParties(tx, cadastros.responsaveis);
  await upsertUnitLinks(tx, cadastros.vinculos);
  await upsertDebts(tx, cadastros.debitos);
  await upsertImports(tx, cadastros.importacoes);
  await upsertAuditLogs(tx, cadastros.auditoria);
  await upsertCollectionAssignments(tx, cadastros.atribuicoesCobranca);
  await upsertServiceTickets(tx, cadastros.atendimentos);
  await upsertNegotiationProposals(tx, cadastros.propostasNegociacao);
  await upsertAgreementInstallments(tx, cadastros.parcelasAcordo);
  await upsertAgreementPayments(tx, cadastros.pagamentosAcordo);
  await upsertLegalReferrals(tx, cadastros.encaminhamentosJuridicos);
  await upsertLegalDocuments(tx, cadastros.documentosJuridicos);
  await upsertInternalNotifications(tx, cadastros.notificacoesInternas);
  await upsertNotificationFailures(tx, cadastros.notificacaoFalhas);
  await syncOrphans(tx, cadastros);
}

/** Persiste o catálogo completo nas tabelas normalizadas (sem catalogo_snapshot). */
export async function saveCatalogBulkToPostgres(cadastros: Cadastros): Promise<boolean> {
  if (!databaseUrlConfigured()) return false;
  try {
    if (catalogoOperacionalVazio(cadastros)) {
      const linhasDb = await contagemLinhasOperacionaisDb();
      if (linhasDb > 0) {
        console.error(
          "[prisma] recusando gravar catálogo operacional vazio sobre linhas existentes (proteção anti-perda).",
        );
        return false;
      }
    }

    await prisma.$transaction(async (tx) => {
      await persistCatalogInTransaction(tx, cadastros);
    });
    return true;
  } catch (error) {
    console.error("[prisma] falha ao gravar catálogo nas tabelas:", error);
    return false;
  }
}

/** Alias legado usado por catalog-persist.ts */
export const salvarCatalogoNoPostgres = saveCatalogBulkToPostgres;
