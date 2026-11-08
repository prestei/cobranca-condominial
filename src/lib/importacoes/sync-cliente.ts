import {
  setDebitos,
  setImportacoes,
  setResponsaveis,
  setVinculos,
  type Condominio,
  type Debito,
  type Importacao,
  type Responsavel,
  type Unidade,
  type Vinculo,
} from "@/data/catalogo";
import { sincronizarCondominiosDoServidor } from "@/lib/condominios/sync-cliente";
import { sincronizarUnidadesDoServidor } from "@/lib/unidades/sync-cliente";

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

export function aplicarImportacaoExcluida(importacaoId: number) {
  setImportacoes((current) => current.filter((item) => item.id !== importacaoId));
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

export function mesclarCondominiosImportacao(condominios: Condominio[], userId?: number) {
  if (condominios.length === 0) return;
  sincronizarCondominiosDoServidor(condominios, userId);
}

export function mesclarUnidadesImportacao(unidades: Unidade[], userId?: number) {
  if (unidades.length === 0) return;
  sincronizarUnidadesDoServidor(unidades, userId);
}

export function mesclarResponsaveisImportacao(responsaveis: Responsavel[], vinculos: Vinculo[]) {
  if (responsaveis.length > 0) {
    setResponsaveis((current) => {
      const mapa = new Map(current.map((item) => [item.id, item]));
      for (const item of responsaveis) mapa.set(item.id, item);
      return [...mapa.values()].sort((a, b) => a.id - b.id);
    });
  }
  if (vinculos.length > 0) {
    setVinculos((current) => {
      const mapa = new Map(current.map((item) => [item.id, item]));
      for (const item of vinculos) mapa.set(item.id, item);
      return [...mapa.values()].sort((a, b) => a.id - b.id);
    });
  }
}
