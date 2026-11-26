import {
  diasDeAtraso,
  formatarData,
  formatarMoeda,
  nomeCondominio,
  nomeUnidade,
  nomeUsuario,
  persistedDebtBalanceAmount,
  retornoPendente,
  type AtribuicaoCobranca,
  type Cadastros,
  type Debito,
  type PropostaNegociacao,
} from "@/data/catalogo";
import { codigoReDoUsuario } from "@/lib/colaboradores/re";
import { formatarProximoRetorno } from "@/lib/fila/formatar-proximo-retorno";
import type { DebitoNegociacaoFinanceira } from "@/lib/debitos/negotiation-financial-sync";

export type ContextoCobrancaUnidade = {
  codigoRe: string | null;
  nomeAtendente: string | null;
  ultimoAtendimento: string | null;
  proximoRetorno: string | null;
};

function atribuicaoVigente(cadastros: Cadastros, unidadeId: number): AtribuicaoCobranca | undefined {
  return cadastros.atribuicoesCobranca.find((item) => item.unidadeId === unidadeId && !item.encerradoEm);
}

export function contextoCobrancaUnidade(cadastros: Cadastros, unidadeId: number): ContextoCobrancaUnidade {
  const vigente = atribuicaoVigente(cadastros, unidadeId);
  const atendente = vigente ? cadastros.usuarios.find((item) => item.id === vigente.atendenteId) : undefined;
  const lista = cadastros.atendimentos
    .filter((item) => Number(item.unidadeId) === unidadeId)
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  const ultimo = lista[0]?.dataHora ?? null;
  const pendentesRetorno = lista.filter(retornoPendente).sort((a, b) => {
    const da = a.dataProximaAcao || "";
    const db = b.dataProximaAcao || "";
    return da.localeCompare(db);
  });
  const proximo = pendentesRetorno[0];
  return {
    codigoRe: atendente ? codigoReDoUsuario(atendente) : null,
    nomeAtendente: atendente?.nome.trim() || null,
    ultimoAtendimento: ultimo,
    proximoRetorno: proximo?.dataProximaAcao ?? null,
  };
}

export function rotuloResponsavelUnidade(cadastros: Cadastros, unidadeId: number): string {
  const ctx = contextoCobrancaUnidade(cadastros, unidadeId);
  if (ctx.codigoRe) return ctx.codigoRe;
  if (ctx.nomeAtendente) return ctx.nomeAtendente;
  return "—";
}

export function propostaNegociacaoDoDebito(
  cadastros: Cadastros,
  negociacao: DebitoNegociacaoFinanceira | undefined,
): PropostaNegociacao | undefined {
  if (!negociacao?.propostaId) return undefined;
  return cadastros.propostasNegociacao.find((item) => item.id === negociacao.propostaId);
}

export function saldoPendenteDebito(
  item: Debito,
  negociacao: DebitoNegociacaoFinanceira | undefined,
  dataBase: string,
): number {
  if (negociacao?.saldoRestante) {
    const valor = Number(negociacao.saldoRestante);
    if (Number.isFinite(valor)) return valor;
  }
  if (item.dataVencimento && item.dataVencimento <= dataBase) {
    return persistedDebtBalanceAmount(item);
  }
  return persistedDebtBalanceAmount(item);
}

export function diasAtrasoDebito(item: Debito, dataBase: string): number | null {
  if (!item.dataVencimento || item.dataVencimento > dataBase) return null;
  return diasDeAtraso(item.dataVencimento, dataBase);
}

export function formatoLinhaExportacaoRecorte(
  recorte: import("@/lib/debitos/painel-situacao").RecorteListagemInadimplenciaId,
  item: Debito,
  cadastros: Cadastros,
  dataBase: string,
  negociacao: DebitoNegociacaoFinanceira | undefined,
): string[] {
  const ctx = contextoCobrancaUnidade(cadastros, item.unidadeId);
  const proposta = propostaNegociacaoDoDebito(cadastros, negociacao);
  const base = [
    nomeCondominio(item.condominioId, cadastros),
    nomeUnidade(item.unidadeId, cadastros),
    item.referencia,
  ];

  switch (recorte) {
    case "em_aberto":
      return [
        ...base,
        formatarMoeda(item.valorOriginal),
        formatarMoeda(String(saldoPendenteDebito(item, negociacao, dataBase))),
        diasAtrasoDebito(item, dataBase) !== null ? String(diasAtrasoDebito(item, dataBase)) : "—",
        rotuloResponsavelUnidade(cadastros, item.unidadeId),
        ctx.ultimoAtendimento ? formatarData(ctx.ultimoAtendimento) : "—",
        ctx.proximoRetorno ? formatarProximoRetorno(ctx.proximoRetorno) : "—",
      ];
    case "em_negociacao":
      return [
        ...base,
        formatarMoeda(item.valorOriginal),
        negociacao?.valorNegociado ? formatarMoeda(negociacao.valorNegociado) : "—",
        negociacao?.descontoConcedido ? formatarMoeda(negociacao.descontoConcedido) : "—",
        negociacao?.valorPagoConfirmado ? formatarMoeda(negociacao.valorPagoConfirmado) : "—",
        negociacao?.saldoRestante ? formatarMoeda(negociacao.saldoRestante) : "—",
        proposta?.quantidadeParcelas != null ? String(proposta.quantidadeParcelas) : "—",
        negociacao?.situacao ?? proposta?.status ?? "—",
      ];
    case "quitadas":
      return [
        ...base,
        formatarMoeda(item.valorOriginal),
        formatarMoeda(item.valorPago || item.valorAtualizado),
        item.dataPagamento ? formatarData(item.dataPagamento) : "—",
        negociacao?.propostaId ? `Proposta ${negociacao.propostaId.slice(0, 8)}` : "—",
        item.usuarioSituacaoOperacionalId
          ? nomeUsuario(item.usuarioSituacaoOperacionalId, cadastros)
          : "—",
      ];
    case "prescritas":
      return [
        ...base,
        formatarMoeda(item.valorOriginal),
        item.prescritoEm ? formatarData(item.prescritoEm) : "—",
        item.usuarioPrescricaoId ? nomeUsuario(item.usuarioPrescricaoId, cadastros) : "—",
        item.justificativaPrescricao || "—",
      ];
    case "historico":
    default:
      return [
        ...base,
        formatarData(item.dataVencimento),
        item.status,
        item.situacaoOperacional || "—",
      ];
  }
}

export function colunasExportacaoRecorte(
  recorte: import("@/lib/debitos/painel-situacao").RecorteListagemInadimplenciaId,
): string[] {
  const comum = ["Condomínio", "Unidade", "Referência"];
  switch (recorte) {
    case "em_aberto":
      return [
        ...comum,
        "Valor original",
        "Saldo pendente",
        "Dias em atraso",
        "Responsável (RE)",
        "Último atendimento",
        "Próximo retorno",
      ];
    case "em_negociacao":
      return [
        ...comum,
        "Valor original",
        "Valor negociado",
        "Desconto",
        "Valor pago",
        "Saldo restante",
        "Parcelas",
        "Situação da negociação",
      ];
    case "quitadas":
      return [
        ...comum,
        "Valor original",
        "Valor quitado",
        "Data da quitação",
        "Negociação",
        "Confirmação",
      ];
    case "prescritas":
      return [
        ...comum,
        "Valor original",
        "Data da classificação",
        "Responsável",
        "Justificativa",
      ];
    case "historico":
    default:
      return [...comum, "Vencimento", "Situação do débito", "Situação operacional"];
  }
}