import { setDebitos, setImportacoes, type Debito, type Importacao } from "@/data/catalogo";

export function sincronizarImportacoesDoServidor(importacoes: Importacao[]) {
  const ids = new Set(importacoes.map((item) => item.id));
  setImportacoes((current) => {
    const legado = current.filter((item) => !ids.has(item.id));
    const mapa = new Map<number, Importacao>();
    for (const item of legado) mapa.set(item.id, item);
    for (const item of importacoes) mapa.set(item.id, item);
    return [...mapa.values()].sort((a, b) => b.dataImportacao.localeCompare(a.dataImportacao));
  });
}

export function aplicarImportacaoSalva(importacao: Importacao) {
  setImportacoes((current) => {
    if (current.some((item) => item.id === importacao.id)) {
      return current.map((item) => (item.id === importacao.id ? importacao : item));
    }
    return [importacao, ...current];
  });
}

export function mesclarDebitosDoServidor(debitos: Debito[]) {
  if (debitos.length === 0) return;
  setDebitos((current) => {
    const mapa = new Map(current.map((item) => [item.id, item]));
    for (const item of debitos) mapa.set(item.id, item);
    return [...mapa.values()].sort((a, b) => a.id - b.id);
  });
}
