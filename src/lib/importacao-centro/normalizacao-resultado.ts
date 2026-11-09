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

export type TipoCampoNormalizacao =
  | "data"
  | "monetario"
  | "decimal"
  | "telefone"
  | "email"
  | "cpfCnpj"
  | "nome"
  | "codigo"
  | "categoria"
  | "vazio";

export type SpecCampoNormalizacao = {
  tipo: TipoCampoNormalizacao;
  raw: string | undefined | null;
  obrigatorio?: boolean;
};

export type OpcoesValorMonetario = {
  obrigatorio?: boolean;
  casasDecimais?: number;
  /**
   * Preenchimento explícito do adaptador quando a célula está vazia.
   * Não é interpretação: o normalizador marca `vazio: true`.
   */
  valorSeVazio?: string | null;
};

export type OpcoesDecimal = {
  obrigatorio?: boolean;
  casasDecimais?: number;
  valorSeVazio?: string | null;
};
