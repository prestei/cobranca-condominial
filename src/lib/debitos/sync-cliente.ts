import { escopoCondominios, escopoUnidades, getCadastros, setDebitos, type Debito } from "@/data/catalogo";

export function sincronizarDebitosDoServidor(debitos: Debito[], userId?: number) {
  const idsCondominio = new Set(escopoCondominios(getCadastros(), userId).map((item) => item.id));
  const idsUnidade = new Set(escopoUnidades(getCadastros(), userId).map((item) => item.id));
  setDebitos((current) => {
    const foraDoEscopoVisivel = current.filter(
      (item) => !idsCondominio.has(item.condominioId) || !idsUnidade.has(item.unidadeId),
    );
    const noEscopo = debitos.filter(
      (item) => idsCondominio.has(item.condominioId) && idsUnidade.has(item.unidadeId),
    );
    return [...foraDoEscopoVisivel, ...noEscopo].sort(
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
