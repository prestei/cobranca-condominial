import { formatarData } from "@/data/catalogo";

export type MetaPainelIndicadores = {
  geradoEm: string;
  filtros: string[];
};

export function geradoEmBr(): string {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function metaDashboard(dataBase: string, limiteDias: number): MetaPainelIndicadores {
  return {
    geradoEm: geradoEmBr(),
    filtros: [`Data-base: ${formatarData(dataBase)}`, `Limite cobrança amigável: ${limiteDias} dias`],
  };
}

export function metaIndicadoresOperacionais(dataBase: string, limiteDias: number, periodo: { inicio: string; fim: string }) {
  return {
    geradoEm: geradoEmBr(),
    filtros: [
      `Período operacional: ${formatarData(periodo.inicio)} a ${formatarData(periodo.fim)}`,
      `Inadimplência (data-base): ${formatarData(dataBase)}`,
      `Limite cobrança amigável: ${limiteDias} dias`,
    ],
  };
}
