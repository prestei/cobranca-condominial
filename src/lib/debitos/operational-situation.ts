import {
  agoraIso,
  debitoEmAberto,
  debitoPrescrito,
  hojeIso,
  type Debito,
  type PropostaNegociacao,
} from "@/data/catalogo";
import { propostaContaComoNegociacaoCriada } from "@/lib/indicadores/regras-evento";
import type { VinculoObrigacaoDebito } from "@/lib/debitos/settlement-eligibility";
import { debitoComObrigacoesCumpridas } from "@/lib/debitos/settlement-eligibility";

/** Situação operacional persistida do débito (distinta da situação de cobrança da unidade). */
export const SITUACAO_OPERACIONAL_EM_ABERTO = "Em aberto" as const;
export const SITUACAO_OPERACIONAL_EM_NEGOCIACAO = "Em negociação" as const;
export const SITUACAO_OPERACIONAL_QUITADA = "Quitada" as const;
export const SITUACAO_OPERACIONAL_PRESCRITA = "Prescrita" as const;

export const situacoesOperacionaisDebito = [
  SITUACAO_OPERACIONAL_EM_ABERTO,
  SITUACAO_OPERACIONAL_EM_NEGOCIACAO,
  SITUACAO_OPERACIONAL_QUITADA,
  SITUACAO_OPERACIONAL_PRESCRITA,
] as const;

export type SituacaoOperacionalDebito = (typeof situacoesOperacionaisDebito)[number];

const ATIVAS_OPERACIONAIS = new Set<string>([
  SITUACAO_OPERACIONAL_EM_ABERTO,
  SITUACAO_OPERACIONAL_EM_NEGOCIACAO,
]);

export function situacaoOperacionalDebito(item: Pick<Debito, "situacaoOperacional">): SituacaoOperacionalDebito {
  const raw = item.situacaoOperacional?.trim();
  if (raw && situacoesOperacionaisDebito.includes(raw as SituacaoOperacionalDebito)) {
    return raw as SituacaoOperacionalDebito;
  }
  return SITUACAO_OPERACIONAL_EM_ABERTO;
}

/** Dívida na fila operacional de inadimplência (não quitada nem prescrita). */
export function debitoInadimplenciaAtiva(item: Pick<Debito, "situacaoOperacional">): boolean {
  return ATIVAS_OPERACIONAIS.has(situacaoOperacionalDebito(item));
}

export function idsDebitosEmNegociacaoAtiva(propostas: PropostaNegociacao[]): Set<number> {
  const ids = new Set<number>();
  for (const proposta of propostas) {
    if (!propostaContaComoNegociacaoCriada(proposta)) continue;
    for (const debtId of proposta.debitoIds ?? []) {
      if (Number.isFinite(debtId) && debtId > 0) ids.add(debtId);
    }
  }
  return ids;
}

/** Infere a situação operacional a partir dos campos financeiros e vínculos. */
export function inferirSituacaoOperacionalDebito(
  debito: Pick<
    Debito,
    "status" | "situacaoInadimplencia" | "dataPagamento" | "dataVencimento" | "valorPago"
  >,
  emNegociacao: boolean,
  vinculoFormalizado?: VinculoObrigacaoDebito | null,
): SituacaoOperacionalDebito {
  if (debitoComObrigacoesCumpridas(debito, vinculoFormalizado ?? null)) {
    return SITUACAO_OPERACIONAL_QUITADA;
  }
  // Acordo formalizado prevalece sobre prescricao para fila e totais (T24/T25).
  if (emNegociacao && debitoEmAberto(debito)) {
    return SITUACAO_OPERACIONAL_EM_NEGOCIACAO;
  }
  if (debitoPrescrito(debito)) {
    return SITUACAO_OPERACIONAL_PRESCRITA;
  }
  if (debitoEmAberto(debito)) {
    return SITUACAO_OPERACIONAL_EM_ABERTO;
  }
  if (debito.status === "Cancelado") {
    return SITUACAO_OPERACIONAL_QUITADA;
  }
  return SITUACAO_OPERACIONAL_EM_ABERTO;
}

export function situacaoOperacionalParaPainel(
  situacao: SituacaoOperacionalDebito,
): "em_aberto" | "em_negociacao" | "quitadas" | "prescritas" | null {
  switch (situacao) {
    case SITUACAO_OPERACIONAL_EM_ABERTO:
      return "em_aberto";
    case SITUACAO_OPERACIONAL_EM_NEGOCIACAO:
      return "em_negociacao";
    case SITUACAO_OPERACIONAL_QUITADA:
      return "quitadas";
    case SITUACAO_OPERACIONAL_PRESCRITA:
      return "prescritas";
    default:
      return null;
  }
}

export type AtualizacaoSituacaoOperacional = {
  debtId: number;
  anterior: SituacaoOperacionalDebito | null;
  nova: SituacaoOperacionalDebito;
  alteradoEm: string;
};

export function planejarAtualizacoesSituacaoOperacional(
  debitos: Debito[],
  propostas: PropostaNegociacao[],
  dataRef = hojeIso(),
  vinculosPorDebito: Map<number, VinculoObrigacaoDebito> = new Map(),
): AtualizacaoSituacaoOperacional[] {
  const emNegociacao = idsDebitosEmNegociacaoAtiva(propostas);
  const saida: AtualizacaoSituacaoOperacional[] = [];
  for (const debito of debitos) {
    const inferida = inferirSituacaoOperacionalDebito(
      debito,
      emNegociacao.has(debito.id),
      vinculosPorDebito.get(debito.id),
    );
    const atual = debito.situacaoOperacional?.trim()
      ? (situacaoOperacionalDebito(debito) as SituacaoOperacionalDebito)
      : null;
    if (atual === inferida) continue;
    saida.push({
      debtId: debito.id,
      anterior: atual,
      nova: inferida,
      alteradoEm: dataRef.slice(0, 10) === hojeIso() ? agoraIso() : `${dataRef}T12:00:00.000Z`,
    });
  }
  return saida;
}