import { agoraIso, confirmacaoPagamentoAcordo, type PagamentoAcordo, type ParcelaAcordo, type PropostaNegociacao } from "@/data/catalogo";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import {
  createAgreementInstallment,
  createAgreementPayment,
  findAgreementInstallmentById,
  findAgreementPaymentById,
  listAgreementInstallmentsByProposal,
  listAgreementPayments,
  updateAgreementInstallment,
  updateAgreementPayment,
} from "@/lib/db/repositories/negotiation-repository";
import { openAssignmentForUnit } from "@/lib/db/service-context";
import { obterPropostaNegociacao, PropostaNegociacaoServiceError } from "@/lib/negociacoes/service";
import { temPermissao } from "@/lib/permissions/check";
import { resolverPermissoesUsuario } from "@/lib/permissions/resolver";
import { calcularResumoAcordo, somaPagamentosParcela, type ResumoAcordo } from "@/lib/acordos/resumo";
import { centavosMonetarios, parcelasCoerentesComValorAcordado } from "@/lib/negociacoes/parcelamento";

export class AcordoServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detalhes?: string[],
  ) {
    super(message);
  }
}

export type ParcelaAcordoInput = {
  numero: number;
  valorPrevisto: string;
  vencimentoEm: string;
};

export type PagamentoAcordoInput = {
  parcelaId: string;
  valor: string;
  dataPagamento: string;
  referenciaComprovante?: string;
  confirmacao?: string;
};

export type ParcelaAcordoCorrecaoInput = {
  valorPrevisto?: string;
  vencimentoEm?: string;
};

export type PagamentoAcordoCorrecaoInput = {
  valor?: string;
  dataPagamento?: string;
  referenciaComprovante?: string;
  confirmacao?: string;
};

async function usuarioVeCarteiraGeral(userId: number) {
  const perm = await resolverPermissoesUsuario(userId);
  return temPermissao(perm, "usuarios", "criar");
}

async function assertCarteiraParaRegistrar(userId: number, unidadeId: number) {
  if (await usuarioVeCarteiraGeral(userId)) return;
  const vigente = await openAssignmentForUnit(unidadeId);
  if (!vigente || vigente.atendenteId !== userId) {
    throw new AcordoServiceError(
      "Esta cobrança não está na sua carteira. Peça redistribuição à administradora.",
      403,
    );
  }
}

function assertPropostaAcordo(proposta: PropostaNegociacao) {
  if (proposta.status !== "Aceita") {
    throw new AcordoServiceError("Parcelas e pagamentos só se aplicam a acordos confirmados (proposta Aceita).", 409);
  }
}

function normalizarValorMonetario(raw: string, campo: string): string {
  const limpo = raw.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!limpo) {
    throw new AcordoServiceError(`Informe ${campo}.`, 400);
  }
  const numero = Number(limpo);
  if (!Number.isFinite(numero) || numero <= 0) {
    throw new AcordoServiceError(`${campo} inválido.`, 400);
  }
  return numero.toFixed(2);
}

function normalizarDataVencimento(raw: string): string {
  const limpo = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(limpo)) {
    throw new AcordoServiceError("Use a data de vencimento no formato AAAA-MM-DD.", 400);
  }
  return limpo;
}

function normalizarDataPagamento(raw: string): string {
  const limpo = raw.trim();
  if (!limpo) {
    throw new AcordoServiceError("Informe a data do pagamento.", 400);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpo)) {
    return `${limpo}T12:00:00.000Z`;
  }
  const parsed = Date.parse(limpo);
  if (!Number.isFinite(parsed)) {
    throw new AcordoServiceError("Data de pagamento inválida.", 400);
  }
  return new Date(parsed).toISOString();
}

async function pagamentosDaProposta(propostaId: string) {
  const todos = await listAgreementPayments();
  return todos.filter((item) => item.propostaId === propostaId);
}

export async function listarParcelasAcordo(userId: number, propostaId: string): Promise<ParcelaAcordo[]> {
  const proposta = await obterPropostaNegociacao(userId, propostaId);
  assertPropostaAcordo(proposta);
  return listAgreementInstallmentsByProposal(propostaId);
}

export async function listarPagamentosAcordo(userId: number, propostaId: string): Promise<PagamentoAcordo[]> {
  const proposta = await obterPropostaNegociacao(userId, propostaId);
  assertPropostaAcordo(proposta);
  const lista = await pagamentosDaProposta(propostaId);
  return lista.sort((a, b) => b.dataPagamento.localeCompare(a.dataPagamento));
}

export async function obterResumoAcordo(userId: number, propostaId: string): Promise<ResumoAcordo> {
  const proposta = await obterPropostaNegociacao(userId, propostaId);
  assertPropostaAcordo(proposta);
  const parcelas = await listAgreementInstallmentsByProposal(propostaId);
  const pagamentos = await pagamentosDaProposta(propostaId);
  return calcularResumoAcordo(proposta, parcelas, pagamentos);
}

export async function registrarParcelasAcordo(
  userId: number,
  propostaId: string,
  parcelasInput: ParcelaAcordoInput[],
  meta?: { ip?: string; userAgent?: string },
): Promise<ParcelaAcordo[]> {
  const perm = await resolverPermissoesUsuario(userId);
  if (!temPermissao(perm, "atendimentos", "criar")) {
    throw new AcordoServiceError("Sem permissão para registrar parcelas.", 403);
  }

  const proposta = await obterPropostaNegociacao(userId, propostaId);
  assertPropostaAcordo(proposta);
  await assertCarteiraParaRegistrar(userId, proposta.unidadeId);

  if (!Array.isArray(parcelasInput) || parcelasInput.length === 0) {
    throw new AcordoServiceError("Informe ao menos uma parcela.", 400);
  }

  const existentes = await listAgreementInstallmentsByProposal(propostaId);
  const numerosUsados = new Set(existentes.map((item) => item.numero));
  const novas: ParcelaAcordo[] = [];

  for (const item of parcelasInput) {
    const numero = Number(item.numero);
    if (!Number.isFinite(numero) || numero <= 0) {
      throw new AcordoServiceError("Número da parcela inválido.", 400);
    }
    if (numerosUsados.has(numero)) {
      throw new AcordoServiceError(`Já existe parcela nº ${numero} neste acordo.`, 409);
    }
    numerosUsados.add(numero);
    novas.push({
      id: crypto.randomUUID(),
      propostaId,
      condominioId: proposta.condominioId,
      unidadeId: proposta.unidadeId,
      numero,
      valorPrevisto: normalizarValorMonetario(item.valorPrevisto, "valor previsto"),
      vencimentoEm: normalizarDataVencimento(item.vencimentoEm),
      criadoEm: agoraIso(),
      criadoPorId: userId,
      canceladoEm: "",
    });
  }

  const todas = [...existentes, ...novas];
  const somaCent = todas.filter((p) => !p.canceladoEm).reduce((sum, p) => sum + centavosMonetarios(p.valorPrevisto), 0);
  const alvoCent = centavosMonetarios(proposta.valorProposto);
  if (todas.length > 0 && !parcelasCoerentesComValorAcordado(somaCent, alvoCent)) {
    throw new AcordoServiceError(
      "A soma das parcelas deve corresponder ao valor negociado (tolerância de 1 centavo).",
      400,
    );
  }

  if (novas.length === 0) {
    return [...existentes].sort((a, b) => a.numero - b.numero);
  }

  for (const parcela of novas) {
    await createAgreementInstallment(parcela);
    await writeAuditLog({
      entity: "agreement_installment",
      recordId: parcela.id,
      action: "INSERT",
      previousData: "",
      newData: JSON.stringify({
        propostaId,
        numero: parcela.numero,
        valorPrevisto: parcela.valorPrevisto,
        vencimentoEm: parcela.vencimentoEm,
      }),
      changedFields: "proposta_id, numero, valor_previsto, vencimento_em",
      userId,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
  }
  return [...existentes, ...novas].sort((a, b) => a.numero - b.numero);
}

export async function cancelarParcelaAcordo(
  userId: number,
  parcelaId: string,
  meta?: { ip?: string; userAgent?: string },
): Promise<ParcelaAcordo> {
  const perm = await resolverPermissoesUsuario(userId);
  if (!temPermissao(perm, "atendimentos", "editar") && !temPermissao(perm, "negociacoes", "editar")) {
    throw new AcordoServiceError("Sem permissão para cancelar parcelas.", 403);
  }

  const anterior = await findAgreementInstallmentById(parcelaId);
  if (!anterior) {
    throw new AcordoServiceError("Parcela não encontrada.", 404);
  }
  if (anterior.canceladoEm) {
    return anterior;
  }
  const proposta = await obterPropostaNegociacao(userId, anterior.propostaId);
  if (proposta.status !== "Aceita") {
    throw new AcordoServiceError("Somente acordos confirmados permitem cancelamento de parcela.", 409);
  }

  const pagamentos = await pagamentosDaProposta(anterior.propostaId);
  const confirmado = somaPagamentosParcela(anterior.id, pagamentos, "Confirmado");
  if (confirmado > 0) {
    throw new AcordoServiceError("Não é possível cancelar parcela com pagamento confirmado.", 409);
  }

  const atualizado: ParcelaAcordo = { ...anterior, canceladoEm: agoraIso() };
  const salvo = await updateAgreementInstallment(atualizado);
  await writeAuditLog({
    entity: "agreement_installment",
    recordId: parcelaId,
    action: "UPDATE",
    previousData: JSON.stringify({ canceladoEm: "" }),
    newData: JSON.stringify({ canceladoEm: salvo.canceladoEm }),
    changedFields: "cancelado_em",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return salvo;
}

export async function corrigirParcelaAcordo(
  userId: number,
  parcelaId: string,
  input: ParcelaAcordoCorrecaoInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<ParcelaAcordo> {
  const perm = await resolverPermissoesUsuario(userId);
  if (!temPermissao(perm, "atendimentos", "editar")) {
    throw new AcordoServiceError("Sem permissão para corrigir parcelas.", 403);
  }

  const anterior = await findAgreementInstallmentById(parcelaId);
  if (!anterior) {
    throw new AcordoServiceError("Parcela não encontrada.", 404);
  }
  if (anterior.canceladoEm) {
    throw new AcordoServiceError("Parcela cancelada não pode ser corrigida.", 409);
  }
  await obterPropostaNegociacao(userId, anterior.propostaId);

  const valorPrevisto =
    input.valorPrevisto !== undefined
      ? normalizarValorMonetario(input.valorPrevisto, "valor previsto")
      : anterior.valorPrevisto;
  const vencimentoEm =
    input.vencimentoEm !== undefined ? normalizarDataVencimento(input.vencimentoEm) : anterior.vencimentoEm;

  if (valorPrevisto === anterior.valorPrevisto && vencimentoEm === anterior.vencimentoEm) {
    return anterior;
  }

  const atualizado: ParcelaAcordo = { ...anterior, valorPrevisto, vencimentoEm };
  const salvo = await updateAgreementInstallment(atualizado);
  await writeAuditLog({
    entity: "agreement_installment",
    recordId: parcelaId,
    action: "UPDATE",
    previousData: JSON.stringify({
      valorPrevisto: anterior.valorPrevisto,
      vencimentoEm: anterior.vencimentoEm,
    }),
    newData: JSON.stringify({ valorPrevisto, vencimentoEm }),
    changedFields: "valor_previsto, vencimento_em",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return salvo;
}

export async function registrarPagamentoAcordo(
  userId: number,
  propostaId: string,
  input: PagamentoAcordoInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<PagamentoAcordo> {
  const perm = await resolverPermissoesUsuario(userId);
  if (!temPermissao(perm, "atendimentos", "criar")) {
    throw new AcordoServiceError("Sem permissão para registrar pagamentos.", 403);
  }

  const proposta = await obterPropostaNegociacao(userId, propostaId);
  assertPropostaAcordo(proposta);
  await assertCarteiraParaRegistrar(userId, proposta.unidadeId);

  const parcela = await findAgreementInstallmentById(input.parcelaId);
  if (!parcela || parcela.propostaId !== propostaId) {
    throw new AcordoServiceError("Parcela inválida para este acordo.", 400);
  }
  if (parcela.canceladoEm) {
    throw new AcordoServiceError("Não é possível registrar pagamento em parcela cancelada.", 409);
  }

  const confirmacao = (input.confirmacao ?? "Informado").trim();
  if (!confirmacaoPagamentoAcordo.includes(confirmacao as (typeof confirmacaoPagamentoAcordo)[number])) {
    throw new AcordoServiceError("Confirmação inválida. Use Informado ou Confirmado.", 400);
  }

  const pagamentosAtuais = await pagamentosDaProposta(propostaId);
  const valorPago = normalizarValorMonetario(input.valor, "valor pago");
  if (confirmacao === "Confirmado") {
    const confirmadoCent = somaPagamentosParcela(parcela.id, pagamentosAtuais, "Confirmado");
    const previstoCent = centavosMonetarios(parcela.valorPrevisto);
    if (confirmadoCent >= previstoCent) {
      throw new AcordoServiceError("Esta parcela já está quitada. Não é possível contabilizar o pagamento novamente.", 409);
    }
    const novoTotal = confirmadoCent + centavosMonetarios(valorPago);
    if (novoTotal > previstoCent) {
      throw new AcordoServiceError("O valor confirmado excede o previsto da parcela.", 400);
    }
  }

  const registro: PagamentoAcordo = {
    id: crypto.randomUUID(),
    propostaId,
    parcelaId: parcela.id,
    unidadeId: proposta.unidadeId,
    valor: valorPago,
    dataPagamento: normalizarDataPagamento(input.dataPagamento),
    referenciaComprovante: (input.referenciaComprovante ?? "").trim(),
    confirmacao,
    criadoEm: agoraIso(),
    registradoPorId: userId,
  };

  const criado = await createAgreementPayment(registro);
  await writeAuditLog({
    entity: "agreement_payment",
    recordId: criado.id,
    action: "INSERT",
    previousData: "",
    newData: JSON.stringify({
      propostaId,
      parcelaId: criado.parcelaId,
      valor: criado.valor,
      confirmacao: criado.confirmacao,
      dataPagamento: criado.dataPagamento,
    }),
    changedFields: "proposta_id, parcela_id, valor, confirmacao, data_pagamento",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return criado;
}

export async function corrigirPagamentoAcordo(
  userId: number,
  pagamentoId: string,
  input: PagamentoAcordoCorrecaoInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<PagamentoAcordo> {
  const perm = await resolverPermissoesUsuario(userId);
  if (!temPermissao(perm, "atendimentos", "editar")) {
    throw new AcordoServiceError("Sem permissão para corrigir pagamentos.", 403);
  }

  const anterior = await findAgreementPaymentById(pagamentoId);
  if (!anterior) {
    throw new AcordoServiceError("Pagamento não encontrado.", 404);
  }
  await obterPropostaNegociacao(userId, anterior.propostaId);

  const valor = input.valor !== undefined ? normalizarValorMonetario(input.valor, "valor pago") : anterior.valor;
  const dataPagamento =
    input.dataPagamento !== undefined ? normalizarDataPagamento(input.dataPagamento) : anterior.dataPagamento;
  const referenciaComprovante =
    input.referenciaComprovante !== undefined ? input.referenciaComprovante.trim() : anterior.referenciaComprovante;
  let confirmacao = anterior.confirmacao;
  if (input.confirmacao !== undefined) {
    confirmacao = input.confirmacao.trim();
    if (!confirmacaoPagamentoAcordo.includes(confirmacao as (typeof confirmacaoPagamentoAcordo)[number])) {
      throw new AcordoServiceError("Confirmação inválida.", 400);
    }
  }

  const atualizado: PagamentoAcordo = {
    ...anterior,
    valor,
    dataPagamento,
    referenciaComprovante,
    confirmacao,
  };

  const salvo = await updateAgreementPayment(atualizado);
  await writeAuditLog({
    entity: "agreement_payment",
    recordId: pagamentoId,
    action: "UPDATE",
    previousData: JSON.stringify({
      valor: anterior.valor,
      dataPagamento: anterior.dataPagamento,
      referenciaComprovante: anterior.referenciaComprovante,
      confirmacao: anterior.confirmacao,
    }),
    newData: JSON.stringify({
      valor,
      dataPagamento,
      referenciaComprovante,
      confirmacao,
    }),
    changedFields: "valor, data_pagamento, referencia_comprovante, confirmacao",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return salvo;
}

export function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}

export { PropostaNegociacaoServiceError };
