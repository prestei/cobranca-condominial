/** Categorias de validação do motor central (Ticket 05). */
export type CategoriaValidacaoImportacao =
  | "estrutural"
  | "cadastral"
  | "relacional"
  | "financeira"
  | "negocio";

/** Severidade por inconsistência — distingue bloqueio de conferência. */
export type SeveridadeInconsistencia = "erro" | "atencao";

/** Classificação agregada do registro após todas as regras. */
export type ResultadoValidacaoImportacao = "valido" | "atencao" | "erro";

export type InconsistenciaValidacao = {
  categoria: CategoriaValidacaoImportacao;
  severidade: SeveridadeInconsistencia;
  /** Identificador estável da regra (ex.: `financeira.valor_negativo`). */
  codigo: string;
  mensagem: string;
  campo?: string;
};

/**
 * Resultado completo por registro — disponível antes da aprovação.
 * O motor não persiste em tabelas de negócio.
 */
export type RegistroValidadoImportacao<TPayload = unknown> = {
  identificador: string;
  linha: number;
  pagina?: number;
  dadosOriginais: Record<string, string>;
  dadosNormalizados: TPayload | Record<string, unknown> | null;
  /** Ticket 04: rastreio campo a campo (original ≠ normalizado). */
  camposNormalizados?: Record<
    string,
    { original: string; normalizado: string | null; vazio: boolean; ambiguo?: boolean; erro?: string }
  >;
  resultado: ResultadoValidacaoImportacao;
  inconsistencias: InconsistenciaValidacao[];
  regrasAplicadas: string[];
};

export type EntradaValidacaoRegistro<TPayload, TContexto> = {
  linha: number;
  linhaBruta: string[];
  cabecalho: string[];
  payload?: TPayload;
  erroParse?: string;
  contexto: TContexto;
  camposNormalizados?: RegistroValidadoImportacao["camposNormalizados"];
};

export type ValidadorModuloImportacao<TPayload = unknown, TContexto = unknown> = {
  readonly modulo: string;
  /** Colunas reconhecidas (cabeçalho já normalizado). Desconhecidas geram ATENÇÃO. */
  readonly colunasReconhecidas: ReadonlySet<string>;
  /** Colunas obrigatórias no cabeçalho; ausência gera ERRO estrutural na linha 1. */
  readonly colunasObrigatorias: readonly string[];
  /** Regras deste módulo (além das categorias A–E do motor). */
  readonly regrasDoModulo?: readonly string[];

  validarEstruturaArquivo?(matriz: string[][]): InconsistenciaValidacao[];

  validarRegistro(entrada: EntradaValidacaoRegistro<TPayload, TContexto>): Omit<
    RegistroValidadoImportacao<TPayload>,
    "identificador" | "linha" | "pagina" | "resultado"
  >;
};
