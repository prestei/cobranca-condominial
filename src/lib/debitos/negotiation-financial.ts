import { persistedDebtBalanceAmount, type Debito } from "@/data/catalogo";
import { centavosMonetarios, monetarioDeCentavos } from "@/lib/negociacoes/parcelamento";

export type AlocacaoNegociacaoDebito = {
  debtId: number;
  valorOriginalRegistrado: string;
  valorNegociadoAlocado: string;
  descontoConcedido: string;
  saldoRestante: string;
};

/** Valor de referência da dívida na formalização (preserva `valor_original` no cadastro). */
export function valorReferenciaOriginalDebito(debito: Pick<Debito, "valorOriginal" | "valor" | "valorAtualizado">): number {
  const original = centavosMonetarios(debito.valorOriginal);
  if (original > 0) return original;
  return persistedDebtBalanceAmount(debito);
}

/** Distribui um total em centavos proporcionalmente aos pesos (últimos índices absorvem o arredondamento). */
export function distribuirProporcionalCentavos(pesosCent: number[], totalCent: number): number[] {
  if (pesosCent.length === 0) return [];
  const somaPesos = pesosCent.reduce((a, b) => a + b, 0);
  if (somaPesos <= 0) {
    const base = Math.floor(totalCent / pesosCent.length);
    const resto = totalCent - base * pesosCent.length;
    return pesosCent.map((_, i) => base + (i < resto ? 1 : 0));
  }
  const bruto = pesosCent.map((p) => Math.floor((totalCent * p) / somaPesos));
  let faltando = totalCent - bruto.reduce((a, b) => a + b, 0);
  const ordem = [...pesosCent.keys()].sort((a, b) => pesosCent[b]! - pesosCent[a]!);
  let idx = 0;
  while (faltando > 0) {
    bruto[ordem[idx % ordem.length]!] = (bruto[ordem[idx % ordem.length]!] ?? 0) + 1;
    faltando -= 1;
    idx += 1;
  }
  return bruto;
}

/** Planeja alocação do valor negociado entre os débitos vinculados. */
export function planejarAlocacaoNegociacao(
  debitos: Debito[],
  valorNegociadoTotal: string,
): AlocacaoNegociacaoDebito[] {
  const totalNegCent = centavosMonetarios(valorNegociadoTotal);
  const bases = debitos.map((d) => ({
    debtId: d.id,
    valorOriginalRegistradoCent: valorReferenciaOriginalDebito(d),
    baseSaldoCent: persistedDebtBalanceAmount(d),
  }));
  const pesos = bases.map((b) => (b.baseSaldoCent > 0 ? b.baseSaldoCent : b.valorOriginalRegistradoCent));
  const negociadosCent = distribuirProporcionalCentavos(pesos, totalNegCent);

  return bases.map((item, i) => {
    const negociadoCent = negociadosCent[i] ?? 0;
    const referenciaDescontoCent =
      item.valorOriginalRegistradoCent > 0 ? item.valorOriginalRegistradoCent : item.baseSaldoCent;
    const descontoCent = Math.max(0, referenciaDescontoCent - negociadoCent);
    return {
      debtId: item.debtId,
      valorOriginalRegistrado: monetarioDeCentavos(item.valorOriginalRegistradoCent),
      valorNegociadoAlocado: monetarioDeCentavos(negociadoCent),
      descontoConcedido: monetarioDeCentavos(descontoCent),
      saldoRestante: monetarioDeCentavos(negociadoCent),
    };
  });
}

/** Reparte pagamentos confirmados do acordo entre os vínculos formalizados. */
export function repartirPagamentosConfirmados(
  alocacoes: Array<{ debtId: number; valorNegociadoAlocado: string }>,
  totalPagoConfirmadoCent: number,
): Map<number, number> {
  const pesos = alocacoes.map((a) => centavosMonetarios(a.valorNegociadoAlocado));
  const pagosCent = distribuirProporcionalCentavos(pesos, totalPagoConfirmadoCent);
  const mapa = new Map<number, number>();
  alocacoes.forEach((a, i) => {
    mapa.set(a.debtId, pagosCent[i] ?? 0);
  });
  return mapa;
}

export function calcularSaldoRestanteNegociado(valorNegociadoCent: number, pagoConfirmadoCent: number): number {
  return Math.max(0, valorNegociadoCent - pagoConfirmadoCent);
}