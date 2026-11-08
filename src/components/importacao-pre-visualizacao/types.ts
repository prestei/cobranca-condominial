import type { SituacaoLinhaImportacao } from "@/lib/importacao-centro/types";
import type { CategoriaValidacaoImportacao, RegistroValidadoImportacao } from "@/lib/importacao-centro/motor-validacao/types";
import type {
  ContagensPreVisualizacaoImportacao,
  CorrecaoPreviaSerializada,
  IndicadorPreVisualizacaoImportacao,
} from "@/lib/importacao-centro/pre-visualizacao";

export type ColunaPreVisualizacaoImportacao = {
  id: string;
  rotulo: string;
  /** Chave em `resumo` ou função customizada. */
  valor: (linha: LinhaPreVisualizacaoImportacaoUi) => string;
  alinhamento?: "left" | "right";
  editavel?: boolean;
  campoNormalizado?: string;
  className?: string;
};

export type LinhaPreVisualizacaoImportacaoUi = {
  linha: number;
  situacao: SituacaoLinhaImportacao;
  mensagem?: string;
  resumo?: Record<string, string>;
  validacao?: RegistroValidadoImportacao;
  indicador: IndicadorPreVisualizacaoImportacao;
  ignoradoPeloUsuario: boolean;
  valoresEditados?: Record<string, string>;
  correcoes?: CorrecaoPreviaSerializada[];
};

export type DadosCabecalhoPreVisualizacao = {
  nomeArquivo: string;
  moduloDestino: string;
  moduloRotulo: string;
  usuarioResponsavel: string;
  dataHoraImportacao: string;
  origem: string;
  quantidadeRegistros: number;
  contagens: ContagensPreVisualizacaoImportacao;
  arquivoJaImportado?: boolean;
};

export type FiltroSituacaoPreVisualizacao =
  | "todos"
  | "valido"
  | "atencao"
  | "erro"
  | "gravacao"
  | "ignorado";

export type FiltroInconsistenciaPreVisualizacao = "todos" | CategoriaValidacaoImportacao;
