/** Numeração operacional RE-10000, RE-10001, … (cinco dígitos após o prefixo). */
export const RE_PREFIXO = "RE";
export const RE_NUMERO_INICIAL = 10_000;

const RE_PADRAO = /^RE-(\d{5})$/i;

export function formatarCodigoRe(numero: number): string {
  if (!Number.isInteger(numero) || numero < RE_NUMERO_INICIAL) {
    throw new Error("Número RE inválido para formatação.");
  }
  return `${RE_PREFIXO}-${String(numero).padStart(5, "0")}`;
}

export function normalizarCodigoRe(codigo: string): string {
  return codigo.trim().toUpperCase();
}

export function codigoReValido(codigo: string): boolean {
  const match = normalizarCodigoRe(codigo).match(RE_PADRAO);
  if (!match) return false;
  const numero = Number(match[1]);
  return Number.isInteger(numero) && numero >= RE_NUMERO_INICIAL;
}

export function numeroDoCodigoRe(codigo: string | undefined | null): number | null {
  if (!codigo?.trim()) return null;
  const match = normalizarCodigoRe(codigo).match(RE_PADRAO);
  if (!match) return null;
  const numero = Number(match[1]);
  if (!Number.isInteger(numero) || numero < RE_NUMERO_INICIAL) return null;
  return numero;
}

export type UsuarioComRe = { id: number; codigoRe?: string };

/** Próximo número sequencial considerando todos os RE já alocados (inclusive inativos). */
export function proximoNumeroReDisponivel(usuarios: UsuarioComRe[]): number {
  let max = RE_NUMERO_INICIAL - 1;
  for (const item of usuarios) {
    const numero = numeroDoCodigoRe(item.codigoRe);
    if (numero !== null) max = Math.max(max, numero);
  }
  return max + 1;
}

export function proximoCodigoReDisponivel(usuarios: UsuarioComRe[]): string {
  return formatarCodigoRe(proximoNumeroReDisponivel(usuarios));
}

export function codigoReEmUso(codigoRe: string, usuarios: UsuarioComRe[], ignorarUsuarioId: number | null) {
  const alvo = normalizarCodigoRe(codigoRe);
  return usuarios.some(
    (item) => item.id !== ignorarUsuarioId && item.codigoRe && normalizarCodigoRe(item.codigoRe) === alvo,
  );
}

let cadeiaReservaRe: Promise<void> = Promise.resolve();

/** Serializa alocação de RE entre requisições concorrentes no mesmo processo. */
export async function reservarCodigoRe<T>(
  usuarios: UsuarioComRe[],
  alocar: (codigoRe: string) => T | Promise<T>,
): Promise<T> {
  let liberar!: () => void;
  const portao = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  const anterior = cadeiaReservaRe;
  cadeiaReservaRe = anterior.then(() => portao);
  await anterior;
  try {
    const codigoRe = proximoCodigoReDisponivel(usuarios);
    if (codigoReEmUso(codigoRe, usuarios, null)) {
      throw new Error("Colisão ao gerar código RE.");
    }
    return await alocar(codigoRe);
  } finally {
    liberar();
  }
}

/** Apenas para testes — reinicia o mutex entre casos. */
export function reiniciarMutexReservaReParaTestes() {
  cadeiaReservaRe = Promise.resolve();
}

export type UsuarioMigracaoRe = { id: number; cargoId: number; codigoRe?: string };

/**
 * Atribui RE-10000+ aos atendentes existentes (ordem por id), preserva RE válidos já alocados
 * e remove RE de perfis que não são atendentes.
 */
export function migrarCodigosReUsuarios<T extends UsuarioMigracaoRe>(
  usuarios: T[],
  cargoAtendenteId: number,
): T[] {
  const atendentes = usuarios
    .filter((item) => item.cargoId === cargoAtendenteId)
    .sort((a, b) => a.id - b.id);

  const reservados = new Set<string>();
  const atribuicoes = new Map<number, string>();
  let proximoLivre = RE_NUMERO_INICIAL;

  function reservarProximo(): string {
    while (reservados.has(formatarCodigoRe(proximoLivre))) {
      proximoLivre += 1;
    }
    const codigo = formatarCodigoRe(proximoLivre);
    reservados.add(codigo);
    proximoLivre += 1;
    return codigo;
  }

  for (const item of atendentes) {
    const numero = numeroDoCodigoRe(item.codigoRe);
    if (numero !== null) {
      const codigo = formatarCodigoRe(numero);
      if (!reservados.has(codigo)) {
        reservados.add(codigo);
        proximoLivre = Math.max(proximoLivre, numero + 1);
        continue;
      }
    }
    atribuicoes.set(item.id, reservarProximo());
  }

  return usuarios.map((item) => {
    if (item.cargoId !== cargoAtendenteId) {
      if (!item.codigoRe) return item;
      const { codigoRe: _removido, ...resto } = item;
      return resto as T;
    }
    const atribuido = atribuicoes.get(item.id);
    if (!atribuido) return item;
    if (item.codigoRe && normalizarCodigoRe(item.codigoRe) === atribuido) return item;
    return { ...item, codigoRe: atribuido };
  });
}
