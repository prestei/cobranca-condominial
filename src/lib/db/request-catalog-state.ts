import { AsyncLocalStorage } from "node:async_hooks";
import type { Cadastros } from "@/data/catalogo";

const requestCatalogStore = new AsyncLocalStorage<Cadastros>();

/** Catálogo exclusivo de testes (sem DATABASE_URL / fora de requisição). */
let testCatalogStore: Cadastros | null = null;

export function enableTestCatalog(cadastros: Cadastros) {
  testCatalogStore = structuredClone(cadastros);
}

export function disableTestCatalog() {
  testCatalogStore = null;
}

export function tryGetRequestCatalog(): Cadastros | undefined {
  return requestCatalogStore.getStore() ?? testCatalogStore ?? undefined;
}

export function getRequestCatalog(): Cadastros {
  const store = tryGetRequestCatalog();
  if (!store) {
    throw new Error(
      "Catálogo indisponível: use runWithCatalog no servidor ou useCadastros() na UI.",
    );
  }
  return store;
}

export function runWithCatalog<T>(cadastros: Cadastros, fn: () => T): T {
  return requestCatalogStore.run(structuredClone(cadastros), fn);
}

export async function runWithCatalogAsync<T>(
  cadastros: Cadastros,
  fn: () => Promise<T>,
): Promise<T> {
  return requestCatalogStore.run(structuredClone(cadastros), fn);
}

export function mutateRequestCatalog(mutator: (current: Cadastros) => Cadastros | void) {
  const store = getRequestCatalog();
  const next = mutator(store);
  if (!next || next === store) return;
  if (requestCatalogStore.getStore() !== undefined) {
    requestCatalogStore.enterWith(next);
  } else if (testCatalogStore) {
    testCatalogStore = next;
  }
}
