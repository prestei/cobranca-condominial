import { executarConfirmacaoImportacaoTransacional } from "@/lib/importacao-centro/confirmacao";
import {
  criarSessaoPreviaAposPreview,
  encerrarSessaoPrevia,
  obterEstadoSessaoPreviaParaConfirmacao,
} from "@/lib/importacao-centro/correcao-previa/servico";
import { montarPreview, pipelineConferencia } from "@/lib/importacao-centro/conferencia";
import { lerArquivoImportacao } from "@/lib/importacao-centro/leitura-arquivo";
import { aplicarMotorValidacaoImportacao } from "@/lib/importacao-centro/motor-validacao";
import { validarEntradaLeitura } from "@/lib/importacao-centro/validacao";
import { registrarPreviaImportacao } from "@/lib/importacao-centro/historico-auditoria";
import { removerProcessoArquivoTemporario } from "@/lib/importacoes/armazenamento-temporario";
import { assertPermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
import { resolverEntradaImportacao } from "@/lib/importacoes/resolver-entrada-importacao";
import {
  enriquecerLinhasConferenciaDebitos,
  type ContextoImportacaoDebitos,
} from "@/lib/importacao-centro/adaptadores/debitos";
import type { DebitoImportRow } from "@/lib/importacoes/importar-debitos-planilha";
import { provisionarCadastrosImportacaoDebitos } from "@/lib/importacoes/inadimplencia/provisionar-cadastros-debitos";
import type {
  AdaptadorImportacao,
  EntradaConfirmacaoImportacao,
  EntradaImportacaoArquivo,
  LinhaConferencia,
  MetaExecucaoImportacao,
  ResultadoConfirmacaoCentral,
} from "@/lib/importacao-centro/types";

function arquivoPadrao(nome: string, fallback: string): string {
  const trimmed = nome.trim();
  return trimmed || fallback;
}

/**
 * Serviço central de importação: leitura → normalização/parse (adaptador) → validação →
 * duplicidade no arquivo → conferência com a base → pré-visualização (sem persistência).
 */
export async function previewImportacaoCentral<TPayload, TContexto>(
  adapter: AdaptadorImportacao<TPayload, TContexto>,
  userId: number,
  input: EntradaImportacaoArquivo,
): Promise<{
  preview: Awaited<ReturnType<typeof montarPreview>>;
  contexto: TContexto;
  linhasInternas: LinhaConferencia<TPayload>[];
  processoId?: string;
  sessaoPreviaId?: string;
}> {
  assertPermissaoAcaoImportacao(userId, "visualizarPrevia");
  const entrada = await resolverEntradaImportacao(adapter.modulo, userId, input);
  const entradaLeitura: EntradaImportacaoArquivo = {
    origem: entrada.origem,
    arquivo: entrada.arquivo,
    conteudo: entrada.conteudo,
    matrizPlanilha: entrada.matrizPlanilha,
    hashArquivo: entrada.hashArquivo,
    processoId: entrada.processoId,
  };
  validarEntradaLeitura(entradaLeitura, adapter);

  const origem = entrada.origem.trim();
  const hashArquivo = entrada.hashArquivo;
  const arquivo = arquivoPadrao(entrada.arquivo, `importacao-${adapter.modulo}.csv`);

  const matriz = lerArquivoImportacao(entrada.conteudo, entrada.matrizPlanilha);
  if (adapter.modulo === "debitos") {
    provisionarCadastrosImportacaoDebitos(matriz, userId, origem);
  }
  const contexto = adapter.prepararContexto(userId);
  if (adapter.modulo === "debitos" && entrada.metadadosRelatorio) {
    const ctxDebitos = contexto as ContextoImportacaoDebitos;
    ctxDebitos.formatoDetectado = entrada.metadadosRelatorio.tipo;
    ctxDebitos.inconsistenciasRelatorio = [...entrada.metadadosRelatorio.inconsistencias];
  }
  const parseadas = adapter.interpretarMatriz(matriz, contexto);
  const resultadoMotor = aplicarMotorValidacaoImportacao(parseadas, {
    modulo: adapter.modulo,
    matriz,
    contexto,
  });
  if (adapter.modulo === "debitos") {
    const extras = (contexto as ContextoImportacaoDebitos).inconsistenciasRelatorio ?? [];
    if (extras.length > 0) {
      resultadoMotor.inconsistenciasArquivo.push(...extras);
    }
  }
  const validadas = resultadoMotor.linhas;
  let linhasInternas = pipelineConferencia(validadas, adapter, contexto);
  if (adapter.modulo === "debitos") {
    linhasInternas = enriquecerLinhasConferenciaDebitos(linhasInternas as LinhaConferencia<DebitoImportRow>[]);
  }

  const adapterPreview =
    adapter.modulo === "debitos" && (contexto as ContextoImportacaoDebitos).formatoDetectado
      ? {
          ...adapter,
          formato: (contexto as ContextoImportacaoDebitos).formatoDetectado ?? adapter.formato,
        }
      : adapter;

  const preview = montarPreview({
    hashArquivo,
    origem,
    arquivo,
    adapter: adapterPreview,
    contexto,
    linhas: linhasInternas,
    inconsistenciasArquivo: resultadoMotor.inconsistenciasArquivo,
  });

  const sessaoPreviaId = entrada.processoId?.trim() || undefined;
  if (sessaoPreviaId) {
    registrarPreviaImportacao({
      processoId: sessaoPreviaId,
      userId,
      modulo: adapter.modulo,
      origem,
      arquivo,
      hashArquivo,
      quantidadeRegistros: preview.quantidadeRegistros,
      contadores: preview.contadores,
      resumoAprovacao: preview.resumoAprovacao,
    });
    criarSessaoPreviaAposPreview({
      sessaoPreviaId,
      userId,
      hashArquivo,
      origem,
      arquivo,
      matriz,
      contexto,
      adapter,
      parseadas: validadas,
      linhasInternas,
      inconsistenciasArquivo: resultadoMotor.inconsistenciasArquivo,
    });
  }

  return { preview, contexto, linhasInternas, processoId: entrada.processoId, sessaoPreviaId };
}

/**
 * Confirmação: valida hash, trata idempotência por arquivo, persiste via adaptador e registra histórico.
 * Usa correções da sessão de pré-visualização quando existirem (Ticket 08).
 */
export async function confirmarImportacaoCentral<TPayload, TContexto>(
  adapter: AdaptadorImportacao<TPayload, TContexto>,
  userId: number,
  input: EntradaConfirmacaoImportacao,
  meta?: MetaExecucaoImportacao,
): Promise<ResultadoConfirmacaoCentral> {
  assertPermissaoAcaoImportacao(userId, "aprovarImportacao");
  const entrada = await resolverEntradaImportacao(adapter.modulo, userId, input);
  validarEntradaLeitura(
    {
      origem: entrada.origem,
      arquivo: entrada.arquivo,
      conteudo: entrada.conteudo,
      matrizPlanilha: entrada.matrizPlanilha,
      hashArquivo: entrada.hashArquivo,
      processoId: entrada.processoId,
    },
    adapter,
  );
  const sessaoPreviaId = input.processoId?.trim() || undefined;
  const estadoSessao =
    sessaoPreviaId && entrada.hashArquivo
      ? obterEstadoSessaoPreviaParaConfirmacao<TPayload, TContexto>(
          userId,
          sessaoPreviaId,
          entrada.hashArquivo,
        )
      : null;

  const resultado = await executarConfirmacaoImportacaoTransacional(adapter, userId, input, entrada, meta, {
    linhasConferidas: estadoSessao?.linhasInternas,
    parseadas: estadoSessao?.parseadas,
    contexto: estadoSessao?.contexto,
    historicoCorrecoes: estadoSessao?.historicoCorrecoes,
  });

  if (sessaoPreviaId) {
    encerrarSessaoPrevia(userId, sessaoPreviaId);
    await removerProcessoArquivoTemporario(sessaoPreviaId);
  }

  return resultado;
}
