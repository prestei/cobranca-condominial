/** Formato canônico de código RE operacional (ex.: RE-10002). */
const RE_LOGIN_PATTERN = /^RE-?(\d+)$/i;

/**
 * Normaliza o código de login para comparação e persistência.
 * Aceita RE com ou sem hífen e com espaços (ex.: RE10002, RE - 10002 → RE-10002).
 */
export function normalizarCodigoUsuario(codigo: string) {
  const trimmed = codigo.trim().toLocaleUpperCase("pt-BR");
  const compact = trimmed.replace(/\s+/g, "");
  const reMatch = compact.match(RE_LOGIN_PATTERN);
  if (reMatch) {
    const numero = Number(reMatch[1]);
    if (Number.isInteger(numero) && numero >= 0) {
      return `RE-${String(numero).padStart(5, "0")}`;
    }
  }
  return trimmed;
}

/** Variantes do que o usuário digitou na tela de login (RE abreviado, só número, legado). */
export function chavesCodigoLogin(codigo: string): string[] {
  const chaves = new Set<string>();
  const principal = normalizarCodigoUsuario(codigo);
  if (principal) chaves.add(principal);

  const compact = codigo.trim().replace(/\s+/g, "").toLocaleUpperCase("pt-BR");
  if (/^\d+$/.test(compact)) {
    chaves.add(compact);
    const numero = Number(compact);
    if (Number.isInteger(numero) && numero >= 0) {
      chaves.add(`RE-${String(numero).padStart(5, "0")}`);
    }
  }

  return [...chaves];
}

/** Indica se a entrada de login bate com `code` ou `reCode` persistidos no banco. */
export function entradaLoginCoincideCodigo(
  entrada: string,
  codigoArmazenado: string,
  codigoRe?: string | null,
): boolean {
  const chaves = chavesCodigoLogin(entrada);
  if (chaves.length === 0) return false;
  const code = normalizarCodigoUsuario(codigoArmazenado);
  const re = codigoRe?.trim() ? normalizarCodigoUsuario(codigoRe) : "";
  return chaves.some((chave) => chave === code || (re !== "" && chave === re));
}

export function codigoUsuarioValido(codigo: string) {
  const normalizado = normalizarCodigoUsuario(codigo);
  return normalizado.length >= 2 && normalizado.length <= 32 && /^[A-Z0-9][A-Z0-9._-]*$/.test(normalizado);
}
