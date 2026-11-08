/** Grau de correspondência com um registro existente na base. */
export type TipoCorrespondencia = "nenhuma" | "exata" | "possivel";

/** Ações disponíveis quando há conflito ou ambiguidade (Ticket 06). */
export type AcaoConflitoImportacao =
  | "importar_novo"
  | "ignorar_existente"
  | "atualizar_existente"
  | "solicitar_correcao"
  | "revisao_manual";

export type ResultadoDetecaoDuplicidade = {
  correspondencia: TipoCorrespondencia;
  registroExistenteId?: number;
  chaveComparacao?: string;
  criteriosCoincidentes?: string[];
  criteriosDivergentes?: string[];
  acoesPermitidas: AcaoConflitoImportacao[];
  acaoPadrao: AcaoConflitoImportacao;
  mensagem?: string;
};

/** Decisão explícita do usuário na confirmação (registrada no histórico). */
export type DecisaoLinhaImportacao = {
  linha: number;
  acao: AcaoConflitoImportacao;
  motivo?: string;
};

export type ConflitoImportacaoLinha = {
  correspondencia: TipoCorrespondencia;
  registroExistenteId?: number;
  acoesPermitidas: AcaoConflitoImportacao[];
  acaoPadrao: AcaoConflitoImportacao;
  criteriosCoincidentes?: string[];
  criteriosDivergentes?: string[];
};
