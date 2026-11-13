/** Mantém só dígitos (valor em centavos durante a digitação). */
export function digitosMoedaPtBr(valor: string) {
  return valor.replace(/\D/g, "");
}

/** Formata dígitos como moeda brasileira (centavos → 1.234,56). */
export function mascaraMoedaPtBr(valorDigitos: string) {
  const digitos = digitosMoedaPtBr(valorDigitos);
  if (!digitos) return "";
  const centavos = Number(digitos);
  if (!Number.isFinite(centavos)) return "";
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Aplica máscara a partir do texto já digitado ou colado no campo. */
export function aplicarMascaraMoedaPtBr(valorCampo: string) {
  return mascaraMoedaPtBr(digitosMoedaPtBr(valorCampo));
}
