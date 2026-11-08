const filasPorChave = new Map<string, Promise<void>>();

/**
 * Serializa confirmações concorrentes do mesmo arquivo (tipo + hash SHA-256).
 * Evita gravação duplicada antes da checagem de idempotência.
 */
export async function comBloqueioConfirmacaoImportacao<T>(
  chave: string,
  executar: () => Promise<T>,
): Promise<T> {
  const anterior = filasPorChave.get(chave) ?? Promise.resolve();
  let liberar: () => void = () => undefined;
  const vez = new Promise<void>((resolve) => {
    liberar = resolve;
  });
  const ticket = anterior.then(() => vez);
  filasPorChave.set(chave, ticket);

  await anterior.catch(() => undefined);

  try {
    return await executar();
  } finally {
    liberar();
    if (filasPorChave.get(chave) === ticket) {
      filasPorChave.delete(chave);
    }
  }
}
