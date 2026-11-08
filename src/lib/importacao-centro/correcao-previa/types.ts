import type { ResultadoValidacaoImportacao } from "@/lib/importacao-centro/motor-validacao/types";

/** Uma alteração registrada na pré-visualização (Ticket 08). */
export type RegistroHistoricoCorrecaoPrevia = {
  linha: number;
  campo: string;
  valorOriginal: string;
  valorCorrigido: string;
  aplicadoEm: string;
  usuarioId: number;
  revalidacao: ResultadoValidacaoImportacao;
};

export type CorrecaoCampoPrevia = {
  campo: string;
  valorOriginal: string;
  valorCorrigido: string;
};
