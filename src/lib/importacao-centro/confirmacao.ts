import { agoraIso, executarTransacaoCatalogo } from "@/data/catalogo";
import { validarAprovacao } from "@/lib/importacao-centro/aprovacao";
import { montarPreview, pipelineConferencia } from "@/lib/importacao-centro/conferencia";
import {
  anexarAcaoConfirmacao,
  registrarHistoricoImportacao,
} from "@/lib/importacao-centro/historico-auditoria";
import { lerArquivoImportacao } from "@/lib/importacao-centro/leitura-arquivo";
import { aplicarMotorValidacaoImportacao } from "@/lib/importacao-centro/motor-validacao";
import { executarPersistenciaAprovada } from "@/lib/importacao-centro/persistencia";
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
import type { DebitoImportRow } from "@/lib/importacoes/importar-debitos-planilha";
import { assertEscopoGravacaoImportacaoDebitos } from "@/lib/importacoes/permissoes";
import type { EntradaImportacaoResolvida } from "@/lib/importacoes/resolver-entrada-importacao";
import { provisionarCadastrosImportacaoDebitos } from "@/lib/importacoes/inadimplencia/provisionar-cadastros-debitos";
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
 * (catálogo em memória / futuro `prisma.$transaction`) e registra histórico + auditoria somente após sucesso.
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

  return comBloqueioConfirmacaoImportacao(chaveBloqueio, async () => {
    let validadas: LinhaParseada<TPayload>[];
    let linhasConferidas: LinhaConferencia<TPayload>[];
    let inconsistenciasArquivo: import("@/lib/importacao-centro/motor-validacao/types").InconsistenciaValidacao[] =
      [];

    const matriz = lerArquivoImportacao(entrada.conteudo, entrada.matrizPlanilha);
    if (adapter.modulo === "debitos") {
      provisionarCadastrosImportacaoDebitos(matriz, userId, origem, meta);
    }
    const contexto =
      adapter.modulo === "debitos" ? adapter.prepararContexto(userId) : (overrides?.contexto ?? adapter.prepararContexto(userId));
    if (overrides?.parseadas) {
      const resultadoMotor = aplicarMotorValidacaoImportacao(overrides.parseadas, {
        modulo: adapter.modulo,
        matriz,
        contexto,
      });
      validadas = resultadoMotor.linhas;
      inconsistenciasArquivo = resultadoMotor.inconsistenciasArquivo;
    } else {
      const parseadas = adapter.interpretarMatriz(matriz, contexto);
      const resultadoMotor = aplicarMotorValidacaoImportacao(parseadas, {
        modulo: adapter.modulo,
        matriz,
        contexto,
      });
      validadas = resultadoMotor.linhas;
      inconsistenciasArquivo = resultadoMotor.inconsistenciasArquivo;
    }
    linhasConferidas = pipelineConferencia(validadas, adapter, contexto);

    const preview = montarPreview({
      hashArquivo,
      origem,
      arquivo,
      adapter,
      contexto,
      linhas: linhasConferidas,
      inconsistenciasArquivo,
    });

    const entradaConfirmacao: EntradaConfirmacaoImportacao = {
      ...input,
      confirmacaoExplicita: input.confirmacaoExplicita ?? true,
    };
    const resumoAprovacao = validarAprovacao(preview, entradaConfirmacao, adapter.modulo);

    if (adapter.modulo === "debitos") {
      assertEscopoGravacaoImportacaoDebitos(
        userId,
        linhasConferidas as LinhaConferencia<DebitoImportRow>[],
        input.linhasIgnoradas,
      );
    }

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

    return executarTransacaoCatalogo(() => {
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

      adapter.finalizarPersistencia(contexto);

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
  });
}
