import type { Importacao } from "@/data/catalogo";
import type { RegistroAcaoImportacao } from "@/lib/importacao-centro/historico-types";
import type { ResumoInconsistenciasImportacao } from "@/lib/importacao-centro/situacao-importacao";

/** Importação enriquecida para listagem/detalhe na UI (sem dependências de servidor). */
export type ImportacaoConsulta = Importacao & {
  resumoInconsistencias?: ResumoInconsistenciasImportacao;
  resultadoFinanceiro?: { valor: string; moeda: "BRL" };
  processoId?: string;
  iniciadoEm?: string;
  aprovadoEm?: string | null;
  usuarioAprovacaoId?: number | null;
  acoes?: RegistroAcaoImportacao[];
  hashArquivoMascarado?: string;
};
