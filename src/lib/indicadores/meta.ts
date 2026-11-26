import { formatarData } from "@/data/catalogo";

export type MetaPainelIndicadores = {
  geradoEm: string;
  filtros: string[];
};

export function geradoEmBr(): string {
  return new Date().toLocaleString("pt-BR", { timeZone: "America/Bahia" });
}

export function metaDashboard(dataBase: string, limiteDias: number): MetaPainelIndicadores {
  return {
    geradoEm: geradoEmBr(),
    filtros: [`Data-base: ${formatarData(dataBase)}`, `Limite cobrança amigável: ${limiteDias} dias`],
  };
}
