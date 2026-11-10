import { Importacao } from "@/data/catalogo";
import { loadFullOperationalCadastros } from "@/lib/db/cadastros-scope";
import { runWithCatalogAsync } from "@/lib/db/request-catalog";
import {
  confirmarImportacaoPorModulo,
  previewImportacaoPorModulo,
  ImportacaoCentroError,
} from "@/lib/importacao-centro";
import { obterSessaoPreviaImportacao } from "@/lib/importacao-centro/correcao-previa/sessao";
import type { ResumoAprovacaoImportacao } from "@/lib/importacao-centro/resumo-aprovacao";
import type { RegistroValidadoImportacao } from "@/lib/importacao-centro/motor-validacao/types";
import {
  contarPreVisualizacao,
  serializarLinhasPreVisualizacao,
  type ContagensPreVisualizacaoImportacao,
  type LinhaPreVisualizacaoSerializada,
} from "@/lib/importacao-centro/pre-visualizacao";
import type { MetaExecucaoImportacao } from "@/lib/importacao-centro/types";
import type { DecisaoLinhaImportacao } from "@/lib/importacao-centro/detecao-duplicidades/types";

export { ImportacaoCentroError };
export type {
  EntradaConfirmarImportacaoModulo,
  EntradaPreviewImportacaoModulo,
  LinhaPreviewImportacaoModulo,
  PreviewImportacaoModulo,
  ResultadoConfirmacaoModulo,
} from "@/lib/importacoes/preview-importacao-modulo.types";
import type {
  EntradaConfirmarImportacaoModulo,
  EntradaPreviewImportacaoModulo,
  LinhaPreviewImportacaoModulo,
  PreviewImportacaoModulo,
  ResultadoConfirmacaoModulo,
} from "@/lib/importacoes/preview-importacao-modulo.types";

export function mapearPreviewImportacaoModulo(
  preview: Awaited<ReturnType<typeof previewImportacaoPorModulo>>["preview"],
  moduloDestino: string,
  extras?: { sessaoPreviaId?: string; userId?: number; hashArquivo?: string },
): PreviewImportacaoModulo {
  const correcoesPorLinha =
    extras?.sessaoPreviaId && extras.userId
      ? obterSessaoPreviaImportacao<unknown, unknown>(extras.userId, extras.sessaoPreviaId, extras.hashArquivo)
          ?.correcoesPorLinha
      : undefined;
  const linhas = serializarLinhasPreVisualizacao(preview.linhas, correcoesPorLinha) as LinhaPreviewImportacaoModulo[];

  return {
    hashArquivo: preview.hashArquivo,
    formato: preview.formato,
    arquivo: preview.arquivo,
    origem: preview.origem,
    moduloDestino,
    quantidadeRegistros: preview.quantidadeRegistros,
    novos: preview.contadores.novos,
    atualizacoes: preview.contadores.atualizacoes,
    duplicados: preview.contadores.duplicados,
    erros: preview.contadores.erros,
    manualProtegido: preview.contadores.manualProtegido,
    revisoes: preview.contadores.revisoes,
    arquivoJaImportado: preview.arquivoJaImportado,
    contagensPrevia: contarPreVisualizacao(preview.linhas),
    linhas,
    amostraValida: preview.amostraValida.map((item) => ({
      linha: item.linha,
      situacao: item.situacao,
      mensagem: item.mensagem,
      resumo: item.resumo,
      validacao: item.validacao,
    })) as LinhaPreviewImportacaoModulo[],
    resumoAprovacao: preview.resumoAprovacao!,
    sessaoPreviaId: extras?.sessaoPreviaId,
  };
}

export function criarServicoImportacaoModulo(modulo: string) {
  return {
    async preview(userId: number, input: EntradaPreviewImportacaoModulo): Promise<PreviewImportacaoModulo> {
      const catalogoInicial = await loadFullOperationalCadastros();
      const { preview, sessaoPreviaId } = await runWithCatalogAsync(catalogoInicial, () =>
        previewImportacaoPorModulo(modulo, userId, input),
      );
      return mapearPreviewImportacaoModulo(preview, modulo, {
        sessaoPreviaId,
        userId,
        hashArquivo: preview.hashArquivo,
      });
    },

    async confirmar(
      userId: number,
      input: EntradaConfirmarImportacaoModulo,
      meta?: MetaExecucaoImportacao,
    ): Promise<ResultadoConfirmacaoModulo> {
      const catalogoInicial = await loadFullOperationalCadastros();
      const resultado = await runWithCatalogAsync(catalogoInicial, () =>
        confirmarImportacaoPorModulo(
          modulo,
          userId,
          { ...input, confirmacaoExplicita: input.confirmacaoExplicita ?? true },
          meta,
        ),
      );
      if (!resultado.importacao) {
        throw new ImportacaoCentroError("Não foi possível concluir a importação.", 500);
      }
      return {
        importacao: resultado.importacao,
        novos: resultado.contadores.novos,
        atualizados: resultado.contadores.atualizacoes,
        duplicados: resultado.contadores.duplicados,
        erros: resultado.contadores.erros,
        manualProtegido: resultado.contadores.manualProtegido,
      };
    },
  };
}
