export function digitosCpf(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 11);
}

/** Formata CPF: 000.000.000-00 */
export function formatarCpf(valor: string) {
  const digitos = digitosCpf(valor);
  if (!digitos) return "";
  if (digitos.length <= 3) return digitos;
  if (digitos.length <= 6) return `${digitos.slice(0, 3)}.${digitos.slice(3)}`;
  if (digitos.length <= 9) return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6)}`;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}
