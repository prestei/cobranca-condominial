import { agoraIso } from "@/data/catalogo";
import { executarTransacaoCatalogo } from "@/data/catalogo-store";
import { loadFullOperationalCadastros } from "@/lib/db/cadastros-scope";
import { runWithCatalogAsync } from "@/lib/db/request-catalog";
import { validarAprovacao } from "@/lib/importacao-centro/aprovacao";
import {
  anexarAcaoConfirmacao,
  registrarHistoricoImportacao,
} from "@/lib/importacao-centro/historico-auditoria";
import { executarPersistenciaAprovada } from "@/lib/importacao-centro/persistencia";
import { processarArquivoImportacao } from "@/lib/importacao-centro/processamento";
import { comBloqueioConfirmacaoImportacao } from "@/lib/importacao-centro/transacao-confirmacao";
import type {
  AdaptadorImportacao,
  DadosAprovacaoImportacao,
  EntradaConfirmacaoImportacao,
  MetaExecucaoImportacao,
  PreviewImportacaoCentral,
  ResultadoConfirmacaoCentral,
} from "@/lib/importacao-centro/types";
import type { RegistroHistoricoCorrecaoPrevia } from "@/lib/importacao-centro/correcao-previa/types";
import type { EntradaImportacaoResolvida } from "@/lib/importacoes/resolver-entrada-importacao";
import type { LinhaConferencia, LinhaParseada } from "@/lib/importacao-centro/types";

function arquivoPadrao(nome: string, fallback: string): string {
  const trimmed = nome.trim();
  return trimmed || fallback;
}

function resultadoIdempotente(
  preview: PreviewImportacaoCentral,
  importacao: NonNullable<ResultadoConfirmacaoCentral["importacao"]>,
): ResultadoConfirmacaoCentral {
  return {
    importacao,
    contadores: {
      ...preview.contadores,
      novos: 0,
      atualizacoes: 0,
      duplicados:
        preview.contadores.novos + preview.contadores.atualizacoes + preview.contadores.duplicados,
    },
    idempotente: true,
  };
}

/**
 * Confirmação transacional (Ticket 10): revalida arquivo e base, reaplica duplicidades, grava em bloco único
 * (escopo AsyncLocalStorage → `saveOperationalState` / Prisma) e registra histórico + auditoria após sucesso.
 */
export type OverridesConfirmacaoPrevia<TPayload, TContexto> = {
  linhasConferidas?: LinhaConferencia<TPayload>[];
  parseadas?: LinhaParseada<TPayload>[];
  contexto?: TContexto;
  historicoCorrecoes?: RegistroHistoricoCorrecaoPrevia[];
};

export async function executarConfirmacaoImportacaoTransacional<TPayload, TContexto>(
  adapter: AdaptadorImportacao<TPayload, TContexto>,
  userId: number,
  input: EntradaConfirmacaoImportacao,
  entrada: EntradaImportacaoResolvida,
  meta?: MetaExecucaoImportacao,
  overrides?: OverridesConfirmacaoPrevia<TPayload, TContexto>,
): Promise<ResultadoConfirmacaoCentral> {
  const origem = entrada.origem.trim();
  const hashArquivo = entrada.hashArquivo;
  const arquivo = arquivoPadrao(entrada.arquivo, `importacao-${adapter.modulo}.csv`);
  const chaveBloqueio = `${adapter.tipoImportacao}:${hashArquivo}`;

  const catalogoInicial = await loadFullOperationalCadastros();

  return comBloqueioConfirmacaoImportacao(chaveBloqueio, async () => {
    return runWithCatalogAsync(catalogoInicial, async () => {
    const processado = processarArquivoImportacao(adapter, {
      modo: "confirmacao",
      userId,
      origem,
      arquivo,
      hashArquivo,
      conteudo: entrada.conteudo,
      matrizPlanilha: entrada.matrizPlanilha,
      metadadosRelatorio: entrada.metadadosRelatorio,
      contextoSessao: overrides?.contexto,
      parseadas: overrides?.parseadas,
      linhasConferidas: overrides?.linhasConferidas,
      metaExecucao: meta,
    });

    const { preview, contexto, parseadas: validadas, linhasInternas: linhasConferidas } = processado;

    const entradaConfirmacao: EntradaConfirmacaoImportacao = {
      ...input,
      confirmacaoExplicita: input.confirmacaoExplicita ?? true,
    };
    const resumoAprovacao = validarAprovacao(preview, entradaConfirmacao, adapter.modulo);
    adapter.assertAntesDePersistir?.(userId, linhasConferidas, entradaConfirmacao);

    const dadosAprovacao: DadosAprovacaoImportacao = {
      confirmacaoExplicita: true,
      aprovadoPorUsuarioId: userId,
      aprovadoEm: agoraIso(),
      hashArquivo: preview.hashArquivo,
      importacaoParcial: resumoAprovacao.importacaoParcial,
    };

    const existenteAntes = adapter.buscarImportacaoIdempotente(hashArquivo);
    if (existenteAntes) {
      anexarAcaoConfirmacao(existenteAntes, userId, true, meta);
      adapter.registrarAuditoriaConfirmacao(
        existenteAntes,
        preview.contadores,
        userId,
        meta,
        dadosAprovacao,
      );
      return resultadoIdempotente(preview, existenteAntes);
    }

    const resultado = executarTransacaoCatalogo(() => {
      const existenteNaTransacao = adapter.buscarImportacaoIdempotente(hashArquivo);
      if (existenteNaTransacao) {
        return resultadoIdempotente(preview, existenteNaTransacao);
      }

      const { contadores, relatorio } = executarPersistenciaAprovada(
        adapter,
        contexto,
        linhasConferidas,
        validadas,
        { origem, arquivo, userId },
        input.decisoesLinha,
        input.linhasIgnoradas,
      );

      adapter.finalizarPersistencia(contexto, { userId, origem, arquivo, ...meta });

      const relatorioFinal = {
        ...relatorio,
        correcoesPrevia:
          overrides?.historicoCorrecoes && overrides.historicoCorrecoes.length > 0
            ? overrides.historicoCorrecoes
            : undefined,
      };

      const importacao = adapter.montarRegistroImportacao({
        userId,
        origem,
        arquivo,
        hashArquivo,
        processoId: input.processoId?.trim() || entrada.processoId,
        contadores,
        quantidadeRegistros: preview.quantidadeRegistros,
        importacaoParcial: resumoAprovacao.importacaoParcial,
        aprovacao: dadosAprovacao,
        relatorio: relatorioFinal,
      });

      registrarHistoricoImportacao(importacao);
      anexarAcaoConfirmacao(importacao, userId, false, meta);
      adapter.registrarAuditoriaConfirmacao(importacao, contadores, userId, meta, dadosAprovacao);

      return { importacao, contadores, idempotente: false } satisfies ResultadoConfirmacaoCentral;
    });

    // Persistência definitiva no PostgreSQL (tabelas normalizadas).
    const { getCadastros } = await import("@/data/catalogo-store");
    const { saveOperationalState } = await import("@/lib/db/repositories/catalog-persist");
    const gravou = await saveOperationalState(getCadastros());
    if (!gravou) {
      console.error("[importacao] confirmação gravou no catálogo, mas falhou ao persistir no PostgreSQL.");
    }

    return resultado;
    });
  });
}
