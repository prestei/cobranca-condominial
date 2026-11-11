import { montarPreview, pipelineConferencia } from "@/lib/importacao-centro/conferencia";
import { lerArquivoImportacao } from "@/lib/importacao-centro/leitura-arquivo";
import { aplicarMotorValidacaoImportacao } from "@/lib/importacao-centro/motor-validacao";
import type { InconsistenciaValidacao } from "@/lib/importacao-centro/motor-validacao/types";
import type {
  AdaptadorImportacao,
  LinhaConferencia,
  LinhaParseada,
  MetaExecucaoImportacao,
  MetadadosLeituraArquivoImportacao,
  PreviewImportacaoCentral,
} from "@/lib/importacao-centro/types";

export type ModoProcessamentoImportacao = "preview" | "confirmacao";

export type OpcoesProcessamentoImportacao<TPayload, TContexto> = {
  modo: ModoProcessamentoImportacao;
  userId: number;
  origem: string;
  arquivo: string;
  hashArquivo: string;
  conteudo: string;
  matrizPlanilha?: string[][];
  metadadosRelatorio?: MetadadosLeituraArquivoImportacao;
  contextoSessao?: TContexto;
  parseadas?: LinhaParseada<TPayload>[];
  linhasConferidas?: LinhaConferencia<TPayload>[];
  metaExecucao?: MetaExecucaoImportacao;
};

export type ResultadoProcessamentoImportacao<TPayload, TContexto> = {
  matriz: string[][];
  contexto: TContexto;
  parseadas: LinhaParseada<TPayload>[];
  linhasInternas: LinhaConferencia<TPayload>[];
  preview: PreviewImportacaoCentral;
  inconsistenciasArquivo: InconsistenciaValidacao[];
};

function resolverContexto<TPayload, TContexto>(
  adapter: AdaptadorImportacao<TPayload, TContexto>,
  opcoes: OpcoesProcessamentoImportacao<TPayload, TContexto>,
): TContexto {
  const preparado = adapter.prepararContexto(opcoes.userId);
  if (adapter.aplicarMetadadosLeitura) {
    return adapter.aplicarMetadadosLeitura(preparado, {
      metadadosRelatorio: opcoes.metadadosRelatorio,
      contextoSessao: opcoes.contextoSessao,
    });
  }
  if (opcoes.modo === "confirmacao" && opcoes.contextoSessao) {
    return opcoes.contextoSessao;
  }
  return preparado;
}

/**
 * Processamento central: leitura → parse/normalização do adaptador → validação → duplicidades → conferência.
 * Não persiste linhas importadas. A gravação ocorre só em `persistencia.ts` após aprovação.
 */
export async function processarArquivoImportacao<TPayload, TContexto>(
  adapter: AdaptadorImportacao<TPayload, TContexto>,
  opcoes: OpcoesProcessamentoImportacao<TPayload, TContexto>,
): Promise<ResultadoProcessamentoImportacao<TPayload, TContexto>> {
  const matriz = lerArquivoImportacao(opcoes.conteudo, opcoes.matrizPlanilha);
  await adapter.antesDeInterpretar?.(matriz, {
    userId: opcoes.userId,
    origem: opcoes.origem,
    execucao: opcoes.metaExecucao,
    modo: opcoes.modo,
  });

  const contexto = resolverContexto(adapter, opcoes);
  const interpretadas = opcoes.parseadas ?? adapter.interpretarMatriz(matriz, contexto);
  const resultadoMotor = aplicarMotorValidacaoImportacao(interpretadas, {
    modulo: adapter.modulo,
    matriz,
    contexto,
  });
  const extras = adapter.inconsistenciasArquivo?.(contexto) ?? [];
  if (extras.length > 0) {
    resultadoMotor.inconsistenciasArquivo.push(...extras);
  }

  const validadas = resultadoMotor.linhas;
  let linhasInternas = opcoes.linhasConferidas ?? pipelineConferencia(validadas, adapter, contexto);
  if (!opcoes.linhasConferidas && adapter.aposConferencia) {
    linhasInternas = adapter.aposConferencia(linhasInternas, contexto);
  }

  const formato = adapter.formatoEfetivo?.(contexto) ?? adapter.formato;
  const adapterPreview = formato === adapter.formato ? adapter : { ...adapter, formato };

  const preview = montarPreview({
    hashArquivo: opcoes.hashArquivo,
    origem: opcoes.origem,
    arquivo: opcoes.arquivo,
    adapter: adapterPreview,
    contexto,
    linhas: linhasInternas,
    inconsistenciasArquivo: resultadoMotor.inconsistenciasArquivo,
  });

  return {
    matriz,
    contexto,
    parseadas: validadas,
    linhasInternas,
    preview,
    inconsistenciasArquivo: resultadoMotor.inconsistenciasArquivo,
  };
}
