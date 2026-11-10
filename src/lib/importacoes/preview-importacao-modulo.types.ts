import type { Importacao } from "@/data/catalogo";
import type { DecisaoLinhaImportacao } from "@/lib/importacao-centro/detecao-duplicidades/types";
import type { RegistroValidadoImportacao } from "@/lib/importacao-centro/motor-validacao/types";
import type { ResumoAprovacaoImportacao } from "@/lib/importacao-centro/resumo-aprovacao";
import type {
  ContagensPreVisualizacaoImportacao,
  LinhaPreVisualizacaoSerializada,
} from "@/lib/importacao-centro/pre-visualizacao";

export type LinhaPreviewImportacaoModulo = LinhaPreVisualizacaoSerializada & {
  situacao: string;
  resumo?: Record<string, string>;
  validacao?: RegistroValidadoImportacao<unknown>;
};

export type PreviewImportacaoModulo = {
  hashArquivo: string;
  formato: string;
  arquivo: string;
  origem: string;
  moduloDestino: string;
  quantidadeRegistros: number;
  novos: number;
  atualizacoes: number;
  duplicados: number;
  erros: number;
  manualProtegido: number;
  revisoes: number;
  arquivoJaImportado: boolean;
  contagensPrevia: ContagensPreVisualizacaoImportacao;
  linhas: LinhaPreviewImportacaoModulo[];
  amostraValida: LinhaPreviewImportacaoModulo[];
  resumoAprovacao: ResumoAprovacaoImportacao;
  sessaoPreviaId?: string;
};

export type ResultadoConfirmacaoModulo = {
  importacao: Importacao;
  novos: number;
  atualizados: number;
  duplicados: number;
  erros: number;
  manualProtegido: number;
};

export type EntradaPreviewImportacaoModulo = {
  origem: string;
  arquivo?: string;
  conteudo?: string;
  processoId?: string;
  hashArquivo?: string;
};

export type EntradaConfirmarImportacaoModulo = EntradaPreviewImportacaoModulo & {
  decisoesLinha?: DecisaoLinhaImportacao[];
  confirmacaoExplicita?: boolean;
  cienciaImportacaoParcial?: boolean;
  linhasIgnoradas?: number[];
};
