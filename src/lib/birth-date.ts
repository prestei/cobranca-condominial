export function digitosDataNascimento(valor: string) {
  return valor.replace(/\D/g, "").slice(0, 8);
}

/** Formata data de nascimento: DD/MM/AAAA */
export function formatarDataNascimento(valor: string) {
  const digitos = digitosDataNascimento(valor);
  if (!digitos) return "";
  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 4) return `${digitos.slice(0, 2)}/${digitos.slice(2)}`;
  return `${digitos.slice(0, 2)}/${digitos.slice(2, 4)}/${digitos.slice(4)}`;
}
