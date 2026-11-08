import type { Importacao } from "@/data/catalogo";
import type { AdaptadorImportacao } from "@/lib/importacao-centro/types";
import {
  confirmarImportacaoCentral,
  previewImportacaoCentral,
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
import type { DecisaoLinhaImportacao } from "@/lib/importacao-centro/detecao-duplicidades";

export { ImportacaoCentroError };

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

export function mapearPreviewImportacaoModulo(
  preview: Awaited<ReturnType<typeof previewImportacaoCentral>>["preview"],
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

export function criarServicoImportacaoModulo<TPayload, TContexto>(
  adapter: AdaptadorImportacao<TPayload, TContexto>,
) {
  return {
    async preview(userId: number, input: EntradaPreviewImportacaoModulo): Promise<PreviewImportacaoModulo> {
      const { preview, sessaoPreviaId } = await previewImportacaoCentral(adapter, userId, input);
      return mapearPreviewImportacaoModulo(preview, adapter.modulo, {
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
      const resultado = await confirmarImportacaoCentral(
        adapter,
        userId,
        { ...input, confirmacaoExplicita: input.confirmacaoExplicita ?? true },
        meta,
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
