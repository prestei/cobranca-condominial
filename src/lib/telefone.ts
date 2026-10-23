export function digitosTelefone(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 11);
}

/** Formata telefone brasileiro: (XX) XXXX-XXXX ou (XX) XXXXX-XXXX. */
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
