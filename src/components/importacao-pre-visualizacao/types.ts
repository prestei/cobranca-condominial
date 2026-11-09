import type {
  ContagensPreVisualizacaoImportacao,
  IndicadorPreVisualizacaoImportacao,
  LinhaPreVisualizacaoSerializada,
} from "@/lib/importacao-centro/pre-visualizacao";
import type { CategoriaValidacaoImportacao } from "@/lib/importacao-centro/motor-validacao/types";

export type FiltroSituacaoPreVisualizacao =
  | "todos"
  | "valido"
  | "atencao"
  | "erro"
  | "gravacao"
  | "ignorado";

export type FiltroInconsistenciaPreVisualizacao = "todos" | CategoriaValidacaoImportacao;

export type DadosCabecalhoPreVisualizacao = {
  nomeArquivo: string;
  moduloDestino: string;
  moduloRotulo?: string;
  usuarioResponsavel: string;
  dataHoraImportacao: string;
  origem: string;
  quantidadeRegistros: number | string;
  contagens: ContagensPreVisualizacaoImportacao;
  arquivoJaImportado?: boolean;
};

export type LinhaPreVisualizacaoImportacaoUi = LinhaPreVisualizacaoSerializada & {
  indicador: IndicadorPreVisualizacaoImportacao;
  ignoradoPeloUsuario: boolean;
  valoresEditados?: Record<string, string>;
};

export type ColunaPreVisualizacao = {
  id: string;
  rotulo: string;
  className?: string;
  alinhamento?: "left" | "right";
  valor: (item: LinhaPreVisualizacaoImportacaoUi) => string;
};
