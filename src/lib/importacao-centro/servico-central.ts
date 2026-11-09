import { executarConfirmacaoImportacaoTransacional } from "@/lib/importacao-centro/confirmacao";
import {
  criarSessaoPreviaAposPreview,
  encerrarSessaoPrevia,
  obterEstadoSessaoPreviaParaConfirmacao,
} from "@/lib/importacao-centro/correcao-previa/servico";
import { processarArquivoImportacao } from "@/lib/importacao-centro/processamento";
import { obterAdaptadorImportacao } from "@/lib/importacao-centro/registro-adaptadores";
import { validarEntradaLeitura } from "@/lib/importacao-centro/validacao";
import { registrarPreviaImportacao } from "@/lib/importacao-centro/historico-auditoria";
import { removerProcessoArquivoTemporario } from "@/lib/importacoes/armazenamento-temporario";
import { assertPermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
import { resolverEntradaImportacao } from "@/lib/importacoes/resolver-entrada-importacao";
import type {
  AdaptadorImportacao,
  EntradaConfirmacaoImportacao,
  EntradaImportacaoArquivo,
  LinhaConferencia,
  MetaExecucaoImportacao,
  PreviewImportacaoCentral,
  ResultadoConfirmacaoCentral,
} from "@/lib/importacao-centro/types";

function arquivoPadrao(nome: string, fallback: string): string {
  const trimmed = nome.trim();
  return trimmed || fallback;
}

/**
 * Serviço central de importação: leitura → normalização/parse (adaptador) → validação →
 * duplicidade no arquivo → conferência com a base → pré-visualização (sem persistência de linhas).
 */
export async function previewImportacaoCentral<TPayload, TContexto>(
  adapter: AdaptadorImportacao<TPayload, TContexto>,
  userId: number,
  input: EntradaImportacaoArquivo,
): Promise<{
  preview: Awaited<ReturnType<typeof processarArquivoImportacao<TPayload, TContexto>>>["preview"];
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

  const processado = processarArquivoImportacao(adapter, {
    modo: "preview",
    userId,
    origem,
    arquivo,
    hashArquivo,
    conteudo: entrada.conteudo,
    matrizPlanilha: entrada.matrizPlanilha,
    metadadosRelatorio: entrada.metadadosRelatorio,
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
      quantidadeRegistros: processado.preview.quantidadeRegistros,
      contadores: processado.preview.contadores,
      resumoAprovacao: processado.preview.resumoAprovacao,
    });
    criarSessaoPreviaAposPreview({
      sessaoPreviaId,
      userId,
      hashArquivo,
      origem,
      arquivo,
      matriz: processado.matriz,
      contexto: processado.contexto,
      adapter,
      parseadas: processado.parseadas,
      linhasInternas: processado.linhasInternas,
      inconsistenciasArquivo: processado.inconsistenciasArquivo,
    });
  }

  return {
    preview: processado.preview,
    contexto: processado.contexto,
    linhasInternas: processado.linhasInternas,
    processoId: entrada.processoId,
    sessaoPreviaId,
  };
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

/**
 * Prévia pelo módulo registrado. Impede importação de aba sem adaptador no centro.
 */
export async function previewImportacaoPorModulo(
  modulo: string,
  userId: number,
  input: EntradaImportacaoArquivo,
): Promise<{
  preview: PreviewImportacaoCentral;
  contexto: unknown;
  linhasInternas: LinhaConferencia[];
  processoId?: string;
  sessaoPreviaId?: string;
}> {
  return previewImportacaoCentral(obterAdaptadorImportacao(modulo), userId, input);
}

/**
 * Confirmação pelo módulo registrado. Persistência só após aprovação do pipeline central.
 */
export async function confirmarImportacaoPorModulo(
  modulo: string,
  userId: number,
  input: EntradaConfirmacaoImportacao,
  meta?: MetaExecucaoImportacao,
): Promise<ResultadoConfirmacaoCentral> {
  return confirmarImportacaoCentral(obterAdaptadorImportacao(modulo), userId, input, meta);
}
