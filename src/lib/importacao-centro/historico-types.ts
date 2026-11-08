export type AcaoAuditoriaImportacao =
  | "arquivo_recebido"
  | "previa_gerada"
  | "aprovacao_solicitada"
  | "confirmacao_gravada"
  | "confirmacao_idempotente"
  | "cancelada"
  | "rejeitada";

export type RegistroAcaoImportacao = {
  acao: AcaoAuditoriaImportacao;
  usuarioId: number;
  em: string;
  detalhe?: string;
};
