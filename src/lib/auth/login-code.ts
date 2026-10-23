/** Normaliza o código de login para comparação e persistência. */
export function normalizarCodigoUsuario(codigo: string) {
  return codigo.trim().toLocaleUpperCase("pt-BR");
}

export function codigoUsuarioValido(codigo: string) {
  const normalizado = normalizarCodigoUsuario(codigo);
  return normalizado.length >= 2 && normalizado.length <= 32 && /^[A-Z0-9][A-Z0-9._-]*$/.test(normalizado);
}
