/** Resultado de normalização de um campo importado (original preservado para rastreio). */
export type ResultadoNormalizacao<T> = {
  original: string;
  normalizado: T | null;
  vazio: boolean;
  /** Interpretação duvidosa, sem alterar o valor normalizado quando possível. */
  ambiguo?: boolean;
  /** Falha de conversão — não inventa substituto. */
  erro?: string;
};

export type OpcoesValorMonetario = {
  obrigatorio?: boolean;
  casasDecimais?: number;
  /** Usado somente quando a célula está vazia e o campo é opcional. */
  valorSeVazio?: string | null;
};

export type OpcoesDecimal = {
  obrigatorio?: boolean;
  casasDecimais?: number;
  valorSeVazio?: string | null;
};
