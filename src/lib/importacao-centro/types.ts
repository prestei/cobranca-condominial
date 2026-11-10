import type { Importacao } from "@/data/catalogo";
import type { RegistroHistoricoCorrecaoPrevia } from "@/lib/importacao-centro/correcao-previa/types";
import type { ConflitoImportacaoLinha, DecisaoLinhaImportacao } from "@/lib/importacao-centro/detecao-duplicidades/types";
import type { InconsistenciaValidacao, RegistroValidadoImportacao } from "@/lib/importacao-centro/motor-validacao/types";
import type { ResultadoNormalizacao } from "@/lib/importacao-centro/normalizacao-resultado";
import type { ResumoAprovacaoImportacao } from "@/lib/importacao-centro/resumo-aprovacao";

/** Situação de cada linha após parse, validação e conferência com a base. */
export type SituacaoLinhaImportacao =
  | "novo"
  | "atualizacao"
  | "duplicado"
  | "erro"
  | "manual_protegido"
  | "ignorado"
  /** Correspondência ambígua ou atualização pendente de decisão explícita (Ticket 06). */
  | "revisao";

export type LinhaParseada<TPayload> = {
  linha: number;
  payload?: TPayload;
  erro?: string;
  /** Resultado do motor central de validação (Ticket 05). */
  validacao?: RegistroValidadoImportacao<TPayload>;
  /** Ticket 04: original × normalizado por campo, antes das regras de negócio. */
  camposNormalizados?: Record<string, ResultadoNormalizacao<string>>;
};

export type LinhaConferencia<TPayload = unknown> = {
  linha: number;
  situacao: SituacaoLinhaImportacao;
  mensagem?: string;
  resumo?: Record<string, string>;
  /** Metadados de duplicidade / conflito para decisão do usuário (Ticket 06). */
  conflito?: ConflitoImportacaoLinha;
  /** Preenchido no pipeline interno; não expor na API se o módulo não precisar. */
  payload?: TPayload;
  validacao?: RegistroValidadoImportacao<TPayload>;
};

export type EntradaImportacaoArquivo = {
  origem: string;
  arquivo?: string;
  conteudo?: string;
  processoId?: string;
  hashArquivo?: string;
  matrizPlanilha?: string[][];
};

export type EntradaConfirmacaoImportacao = EntradaImportacaoArquivo & {
  /** Decisões por linha na confirmação (obrigatórias para atualizar registros existentes). */
  decisoesLinha?: DecisaoLinhaImportacao[];
  /** Obrigatório na confirmação — sem este sinal, nada é persistido (Ticket 09). */
  confirmacaoExplicita?: boolean;
  /** Quando a importação é parcial, o usuário deve declarar ciência. */
  cienciaImportacaoParcial?: boolean;
  /** Linhas marcadas para ignorar na conferência (quando suportado pelo módulo). */
  linhasIgnoradas?: number[];
};

export type DadosAprovacaoImportacao = {
  confirmacaoExplicita: true;
  aprovadoPorUsuarioId: number;
  aprovadoEm: string;
  hashArquivo: string;
  importacaoParcial: boolean;
};

export type ContadoresImportacao = {
  novos: number;
  atualizacoes: number;
  duplicados: number;
  erros: number;
  manualProtegido: number;
  ignorados: number;
  revisoes: number;
};

export type PreviewImportacaoCentral = {
  hashArquivo: string;
  formato: string;
  arquivo: string;
  origem: string;
  quantidadeRegistros: number;
  contadores: ContadoresImportacao;
  arquivoJaImportado: boolean;
  linhas: LinhaConferencia[];
  amostraValida: LinhaConferencia[];
  /** Registros validados pelo motor central (sem persistência). */
  registrosValidados?: RegistroValidadoImportacao[];
  inconsistenciasArquivo?: InconsistenciaValidacao[];
  resumoAprovacao?: ResumoAprovacaoImportacao;
};

export type ResultadoConfirmacaoCentral = {
  importacao?: Importacao;
  contadores: ContadoresImportacao;
  idempotente: boolean;
};

export type MetaExecucaoImportacao = {
  ip?: string;
  userAgent?: string;
};

/** Política de aprovação do módulo (Ticket 09), declarada no adaptador — não no orquestrador. */
export type PoliticaAprovacaoModuloImportacao = {
  permitirImportacaoParcial: boolean;
  suportaTotalFinanceiro: boolean;
};

/** Metadados do arquivo já lido (ex.: PDF de inadimplência), sem persistência. */
export type MetadadosLeituraArquivoImportacao = {
  tipo: string;
  inconsistencias: InconsistenciaValidacao[];
};

export type EntradaGanchosLeituraImportacao<TContexto> = {
  metadadosRelatorio?: MetadadosLeituraArquivoImportacao;
  contextoSessao?: TContexto;
};

export type SacolaPersistencia<TPayload, TContexto> = {
  contexto: TContexto;
  payloadsPorLinha: Map<number, TPayload>;
};

/**
 * Contrato que cada módulo (aba) implementa.
 * Regras de negócio ficam no adaptador; o serviço central só orquestra o pipeline.
 */
export interface AdaptadorImportacao<TPayload, TContexto> {
  readonly modulo: string;
  readonly tipoImportacao: Importacao["tipo"];
  readonly formato: string;
  /** Regras de aprovação do módulo; o serviço central só consulta este contrato. */
  readonly politicaAprovacao?: PoliticaAprovacaoModuloImportacao;

  prepararContexto(userId: number): TContexto;

  interpretarMatriz(matriz: string[][], contexto: TContexto): LinhaParseada<TPayload>[];

  validarOrigem(origem: string): string | null;

  chaveDuplicidadeNoArquivo(payload: TPayload): string;

  classificarContraBase(
    payload: TPayload,
    contexto: TContexto,
  ): Pick<LinhaConferencia<TPayload>, "situacao" | "mensagem" | "resumo">;

  arquivoJaImportado(hashArquivo: string): boolean;

  buscarImportacaoIdempotente(hashArquivo: string): Importacao | undefined;

  /**
   * Grava uma linha aprovada. Chamado somente na fase de persistência (confirmação).
   */
  persistirLinha(
    payload: TPayload,
    situacao: SituacaoLinhaImportacao,
    contexto: TContexto,
    meta: { origem: string; arquivo: string; userId: number },
  ): "novo" | "atualizacao" | "ignorado";

  finalizarPersistencia(
    contexto: TContexto,
    meta?: { userId: number; origem?: string; arquivo?: string } & MetaExecucaoImportacao,
  ): void;

  montarRegistroImportacao(input: {
    userId: number;
    origem: string;
    arquivo: string;
    hashArquivo: string;
    processoId?: string;
    contadores: ContadoresImportacao;
    quantidadeRegistros: number;
    importacaoParcial?: boolean;
    aprovacao?: DadosAprovacaoImportacao;
    relatorio: {
      erros: Array<{ linha: number; mensagem: string }>;
      ignorados: Array<{ linha: number; mensagem: string }>;
      decisoes?: DecisaoLinhaImportacao[];
      correcoesPrevia?: RegistroHistoricoCorrecaoPrevia[];
    };
  }): Importacao;

  registrarAuditoriaConfirmacao(
    importacao: Importacao,
    contadores: ContadoresImportacao,
    userId: number,
    meta?: MetaExecucaoImportacao,
    aprovacao?: DadosAprovacaoImportacao,
  ): void;

  /**
   * Gancho opcional do módulo antes do parse. Não deve gravar linhas importadas.
   * (Ex.: provisionar cadastros auxiliares de débitos.)
   */
  antesDeInterpretar?(
    matriz: string[][],
    meta: { userId: number; origem: string; execucao?: MetaExecucaoImportacao },
  ): void;

  /** Aplica metadados do arquivo ou da sessão no contexto, sem regras no orquestrador. */
  aplicarMetadadosLeitura?(
    contexto: TContexto,
    entrada: EntradaGanchosLeituraImportacao<TContexto>,
  ): TContexto;

  inconsistenciasArquivo?(contexto: TContexto): InconsistenciaValidacao[];

  formatoEfetivo?(contexto: TContexto): string | undefined;

  /** Pós-processa a conferência para a prévia (sem persistir). */
  aposConferencia?(linhas: LinhaConferencia<TPayload>[], contexto: TContexto): LinhaConferencia<TPayload>[];

  /** Validação de escopo/autorização imediatamente antes da gravação. */
  assertAntesDePersistir?(
    userId: number,
    linhas: LinhaConferencia<TPayload>[],
    input: EntradaConfirmacaoImportacao,
  ): void;
}

export class ImportacaoCentroError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
