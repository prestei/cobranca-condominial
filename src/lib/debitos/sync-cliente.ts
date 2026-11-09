import { setDebitos, type Debito } from "@/data/catalogo";

/**
 * Mescla débitos da API no catálogo do cliente.
 * Aceita débitos de unidades/condomínios recém-provisionados na importação
 * (não filtrar pelo escopo local antigo — isso descartava os novos).
 */
export function sincronizarDebitosDoServidor(debitos: Debito[], _userId?: number) {
  setDebitos((current) => {
    const idsApi = new Set(debitos.map((item) => item.id));
    const locaisAindaNaoNoServidor = current.filter((item) => !idsApi.has(item.id));
    return [...locaisAindaNaoNoServidor, ...debitos].sort(
      (a, b) => b.dataVencimento.localeCompare(a.dataVencimento) || a.id - b.id,
    );
  });
}

export function aplicarDebitoSalvo(debito: Debito, acao: "INSERT" | "UPDATE") {
  if (acao === "INSERT") {
    setDebitos((current) => {
      if (current.some((item) => item.id === debito.id)) {
        return current.map((item) => (item.id === debito.id ? debito : item));
      }
      return [...current, debito];
    });
  } else {
    setDebitos((current) => current.map((item) => (item.id === debito.id ? debito : item)));
  }
}

export function aplicarDebitoExcluido(id: number) {
  setDebitos((current) => current.filter((item) => item.id !== id));
}
