/** Utilitários de parcelamento com integridade de centavos. */

function centavos(valor: string): number {
  const n = Number(String(valor).replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function deCentavos(c: number): string {
  return (c / 100).toFixed(2);
}

/** Distribui o total em N parcelas; o arredondamento fica nas primeiras parcelas. */
export function distribuirValorEmParcelas(valorTotal: string, quantidade: number): string[] {
  if (!Number.isFinite(quantidade) || quantidade <= 0) {
    throw new Error("INVALID_INSTALLMENT_COUNT");
  }
  const totalCent = centavos(valorTotal);
  if (totalCent <= 0) {
    throw new Error("INVALID_AMOUNT");
  }
  const base = Math.floor(totalCent / quantidade);
  const resto = totalCent - base * quantidade;
  const partes: number[] = Array.from({ length: quantidade }, () => base);
  for (let i = 0; i < resto; i++) {
    partes[i] = (partes[i] ?? 0) + 1;
  }
  return partes.map(deCentavos);
}

export function somaValoresParcelas(valores: string[]): number {
  return valores.reduce((sum, item) => sum + centavos(item), 0);
}

export function datasVencimentoMensais(primeiroVencimento: string, quantidade: number): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(primeiroVencimento)) {
    throw new Error("INVALID_DUE_DATE");
  }
  const [ano, mes, dia] = primeiroVencimento.split("-").map(Number);
  const datas: string[] = [];
  for (let i = 0; i < quantidade; i++) {
    const d = new Date(Date.UTC(ano, mes - 1 + i, dia));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    datas.push(`${y}-${m}-${dd}`);
  }
  return datas;
}

export function parcelasCoerentesComValorAcordado(somaParcelasCent: number, valorAcordadoCent: number): boolean {
  return Math.abs(somaParcelasCent - valorAcordadoCent) <= 1;
}

export { centavos as centavosMonetarios, deCentavos as monetarioDeCentavos };
