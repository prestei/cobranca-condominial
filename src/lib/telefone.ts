/** Dígitos do telefone BR (máx. 11: DDD + celular). */
export function digitosTelefone(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 11);
}

/**
 * Máscara de entrada: `(00) 0000-0000` (10) ou `(00) 00000-0000` (11).
 * Aceita valor já formatado ou só dígitos.
 */
export function formatarTelefone(valor: string) {
  const digitos = digitosTelefone(valor);
  if (!digitos) return "";
  if (digitos.length <= 2) return `(${digitos}`;
  if (digitos.length <= 6) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  if (digitos.length <= 10) {
    return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  }
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
}
