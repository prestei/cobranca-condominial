import {
  agoraIso,
  confirmacaoPagamentoAcordo,
  getCadastros,
  registrarAuditoria,
  setPagamentosAcordo,
  setParcelasAcordo,
  type PagamentoAcordo,
  type ParcelaAcordo,
  type PropostaNegociacao,
} from "@/data/catalogo";
import { obterPropostaNegociacao, PropostaNegociacaoServiceError } from "@/lib/negociacoes/service";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";
import { calcularResumoAcordo, type ResumoAcordo } from "@/lib/acordos/resumo";

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

function usuarioVeCarteiraGeral(userId: number) {
  const perm = permissoesDoUsuarioId(userId);
  return temPermissao(perm, "usuarios", "criar");
}

function atribuicaoVigente(unidadeId: number) {
  return getCadastros().atribuicoesCobranca.find((item) => item.unidadeId === unidadeId && !item.encerradoEm);
}

function assertCarteiraParaRegistrar(userId: number, unidadeId: number) {
  if (usuarioVeCarteiraGeral(userId)) return;
  const vigente = atribuicaoVigente(unidadeId);
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

function parcelasDaProposta(propostaId: string) {
  return getCadastros().parcelasAcordo.filter((item) => item.propostaId === propostaId);
}

function pagamentosDaProposta(propostaId: string) {
  return getCadastros().pagamentosAcordo.filter((item) => item.propostaId === propostaId);
}

export function listarParcelasAcordo(userId: number, propostaId: string): ParcelaAcordo[] {
  const proposta = obterPropostaNegociacao(userId, propostaId);
  assertPropostaAcordo(proposta);
  return parcelasDaProposta(propostaId).sort((a, b) => a.numero - b.numero);
}

export function listarPagamentosAcordo(userId: number, propostaId: string): PagamentoAcordo[] {
  const proposta = obterPropostaNegociacao(userId, propostaId);
  assertPropostaAcordo(proposta);
  return pagamentosDaProposta(propostaId).sort((a, b) => b.dataPagamento.localeCompare(a.dataPagamento));
}

export function obterResumoAcordo(userId: number, propostaId: string): ResumoAcordo {
  const proposta = obterPropostaNegociacao(userId, propostaId);
  assertPropostaAcordo(proposta);
  return calcularResumoAcordo(proposta, parcelasDaProposta(propostaId), pagamentosDaProposta(propostaId));
}

export function registrarParcelasAcordo(
  userId: number,
  propostaId: string,
  parcelasInput: ParcelaAcordoInput[],
  meta?: { ip?: string; userAgent?: string },
): ParcelaAcordo[] {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "atendimentos", "criar")) {
    throw new AcordoServiceError("Sem permissão para registrar parcelas.", 403);
  }

  const proposta = obterPropostaNegociacao(userId, propostaId);
  assertPropostaAcordo(proposta);
  assertCarteiraParaRegistrar(userId, proposta.unidadeId);

  if (!Array.isArray(parcelasInput) || parcelasInput.length === 0) {
    throw new AcordoServiceError("Informe ao menos uma parcela.", 400);
  }

  const existentes = parcelasDaProposta(propostaId);
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
    });
  }

  setParcelasAcordo((current) => [...current, ...novas]);
  for (const parcela of novas) {
    registrarAuditoria(
      {
        entidade: "agreement_installment",
        registroId: parcela.id,
        acao: "INSERT",
        dadosAnteriores: "",
        dadosNovos: JSON.stringify({
          propostaId,
          numero: parcela.numero,
          valorPrevisto: parcela.valorPrevisto,
          vencimentoEm: parcela.vencimentoEm,
        }),
        camposAlterados: "proposta_id, numero, valor_previsto, vencimento_em",
      },
      userId,
      meta,
    );
  }
  return [...existentes, ...novas].sort((a, b) => a.numero - b.numero);
}

export function corrigirParcelaAcordo(
  userId: number,
  parcelaId: string,
  input: ParcelaAcordoCorrecaoInput,
  meta?: { ip?: string; userAgent?: string },
): ParcelaAcordo {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "atendimentos", "editar")) {
    throw new AcordoServiceError("Sem permissão para corrigir parcelas.", 403);
  }

  const anterior = getCadastros().parcelasAcordo.find((item) => item.id === parcelaId);
  if (!anterior) {
    throw new AcordoServiceError("Parcela não encontrada.", 404);
  }
  obterPropostaNegociacao(userId, anterior.propostaId);

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
  setParcelasAcordo((current) => current.map((item) => (item.id === parcelaId ? atualizado : item)));
  registrarAuditoria(
    {
      entidade: "agreement_installment",
      registroId: parcelaId,
      acao: "UPDATE",
      dadosAnteriores: JSON.stringify({
        valorPrevisto: anterior.valorPrevisto,
        vencimentoEm: anterior.vencimentoEm,
      }),
      dadosNovos: JSON.stringify({ valorPrevisto, vencimentoEm }),
      camposAlterados: "valor_previsto, vencimento_em",
    },
    userId,
    meta,
  );
  return atualizado;
}

export function registrarPagamentoAcordo(
  userId: number,
  propostaId: string,
  input: PagamentoAcordoInput,
  meta?: { ip?: string; userAgent?: string },
): PagamentoAcordo {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "atendimentos", "criar")) {
    throw new AcordoServiceError("Sem permissão para registrar pagamentos.", 403);
  }

  const proposta = obterPropostaNegociacao(userId, propostaId);
  assertPropostaAcordo(proposta);
  assertCarteiraParaRegistrar(userId, proposta.unidadeId);

  const parcela = getCadastros().parcelasAcordo.find((item) => item.id === input.parcelaId);
  if (!parcela || parcela.propostaId !== propostaId) {
    throw new AcordoServiceError("Parcela inválida para este acordo.", 400);
  }

  const confirmacao = (input.confirmacao ?? "Informado").trim();
  if (!confirmacaoPagamentoAcordo.includes(confirmacao as (typeof confirmacaoPagamentoAcordo)[number])) {
    throw new AcordoServiceError("Confirmação inválida. Use Informado ou Confirmado.", 400);
  }

  const registro: PagamentoAcordo = {
    id: crypto.randomUUID(),
    propostaId,
    parcelaId: parcela.id,
    unidadeId: proposta.unidadeId,
    valor: normalizarValorMonetario(input.valor, "valor pago"),
    dataPagamento: normalizarDataPagamento(input.dataPagamento),
    referenciaComprovante: (input.referenciaComprovante ?? "").trim(),
    confirmacao,
    criadoEm: agoraIso(),
    registradoPorId: userId,
  };

  setPagamentosAcordo((current) => [...current, registro]);
  registrarAuditoria(
    {
      entidade: "agreement_payment",
      registroId: registro.id,
      acao: "INSERT",
      dadosAnteriores: "",
      dadosNovos: JSON.stringify({
        propostaId,
        parcelaId: registro.parcelaId,
        valor: registro.valor,
        confirmacao: registro.confirmacao,
        dataPagamento: registro.dataPagamento,
      }),
      camposAlterados: "proposta_id, parcela_id, valor, confirmacao, data_pagamento",
    },
    userId,
    meta,
  );
  return registro;
}

export function corrigirPagamentoAcordo(
  userId: number,
  pagamentoId: string,
  input: PagamentoAcordoCorrecaoInput,
  meta?: { ip?: string; userAgent?: string },
): PagamentoAcordo {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "atendimentos", "editar")) {
    throw new AcordoServiceError("Sem permissão para corrigir pagamentos.", 403);
  }

  const anterior = getCadastros().pagamentosAcordo.find((item) => item.id === pagamentoId);
  if (!anterior) {
    throw new AcordoServiceError("Pagamento não encontrado.", 404);
  }
  obterPropostaNegociacao(userId, anterior.propostaId);

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

  setPagamentosAcordo((current) => current.map((item) => (item.id === pagamentoId ? atualizado : item)));
  registrarAuditoria(
    {
      entidade: "agreement_payment",
      registroId: pagamentoId,
      acao: "UPDATE",
      dadosAnteriores: JSON.stringify({
        valor: anterior.valor,
        dataPagamento: anterior.dataPagamento,
        referenciaComprovante: anterior.referenciaComprovante,
        confirmacao: anterior.confirmacao,
      }),
      dadosNovos: JSON.stringify({
        valor,
        dataPagamento,
        referenciaComprovante,
        confirmacao,
      }),
      camposAlterados: "valor, data_pagamento, referencia_comprovante, confirmacao",
    },
    userId,
    meta,
  );
  return atualizado;
}

export function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}

export { PropostaNegociacaoServiceError };
