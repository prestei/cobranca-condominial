import type { Importacao } from "@/data/catalogo";
import { adaptadorImportacaoDebitos } from "@/lib/importacao-centro/adaptadores/debitos";
import { corrigirLinhaPreviaDebitos } from "@/lib/importacao-centro/correcao-previa/servico";
import type { RegistroHistoricoCorrecaoPrevia } from "@/lib/importacao-centro/correcao-previa/types";
import { obterSessaoPreviaImportacao } from "@/lib/importacao-centro/correcao-previa/sessao";
import {
  confirmarImportacaoCentral,
  previewImportacaoCentral,
  ImportacaoCentroError,
} from "@/lib/importacao-centro";
import type { DebitoImportRow } from "@/lib/importacoes/importar-debitos-planilha";
import type { ResumoAprovacaoImportacao } from "@/lib/importacao-centro/resumo-aprovacao";
import type { RegistroValidadoImportacao } from "@/lib/importacao-centro/motor-validacao/types";
import {
  contarPreVisualizacao,
  serializarLinhasPreVisualizacao,
  type ContagensPreVisualizacaoImportacao,
  type LinhaPreVisualizacaoSerializada,
} from "@/lib/importacao-centro/pre-visualizacao";

export { ImportacaoCentroError as ImportacaoDebitosError };

export type LinhaPreviewImportacaoDebito = LinhaPreVisualizacaoSerializada & {
  situacao: "novo" | "atualizacao" | "duplicado" | "erro" | "manual_protegido" | "ignorado" | "revisao";
  resumo?: Record<string, string>;
  validacao?: RegistroValidadoImportacao<DebitoImportRow>;
};

export type PreviewImportacaoDebitos = {
  hashArquivo: string;
  formato: string;
  arquivo: string;
  origem: string;
  /** Módulo de destino no centro de importação (Ticket 07). */
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
  linhas: LinhaPreviewImportacaoDebito[];
  amostraValida: LinhaPreviewImportacaoDebito[];
  resumoAprovacao: ResumoAprovacaoImportacao;
  sessaoPreviaId?: string;
};

export type ResultadoCorrecaoPreviewDebitos = {
  preview: PreviewImportacaoDebitos;
  linha: LinhaPreviewImportacaoDebito;
  historicoCorrecoes: RegistroHistoricoCorrecaoPrevia[];
  correcaoAceita: boolean;
};

export type ResultadoConfirmacaoDebitos = {
  importacao: Importacao;
  novos: number;
  atualizados: number;
  duplicados: number;
  erros: number;
  manualProtegido: number;
};

function mapPreview(
  preview: Awaited<ReturnType<typeof previewImportacaoCentral>>["preview"],
  moduloDestino: string,
  extras?: { sessaoPreviaId?: string; userId?: number; hashArquivo?: string },
): PreviewImportacaoDebitos {
  const correcoesPorLinha =
    extras?.sessaoPreviaId && extras.userId
      ? obterSessaoPreviaImportacao<DebitoImportRow, unknown>(
          extras.userId,
          extras.sessaoPreviaId,
          extras.hashArquivo,
        )?.correcoesPorLinha
      : undefined;
  const linhas = serializarLinhasPreVisualizacao(preview.linhas, correcoesPorLinha) as LinhaPreviewImportacaoDebito[];
  const mapLinha = (item: LinhaPreviewImportacaoDebito) => item;

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
    amostraValida: preview.amostraValida.map((item) =>
      mapLinha({
        linha: item.linha,
        situacao: item.situacao,
        mensagem: item.mensagem,
        resumo: item.resumo,
        validacao: item.validacao,
      } as LinhaPreviewImportacaoDebito),
    ),
    resumoAprovacao: preview.resumoAprovacao!,
    sessaoPreviaId: extras?.sessaoPreviaId,
  };
}

export async function previewImportacaoDebitos(
  userId: number,
  input: {
    origem: string;
    arquivo?: string;
    conteudo?: string;
    processoId?: string;
    hashArquivo?: string;
  },
): Promise<PreviewImportacaoDebitos> {
  const { preview, sessaoPreviaId } = await previewImportacaoCentral(adaptadorImportacaoDebitos, userId, input);
  return mapPreview(preview, adaptadorImportacaoDebitos.modulo, {
    sessaoPreviaId,
    userId,
    hashArquivo: preview.hashArquivo,
  });
}

export function corrigirLinhaPreviewImportacaoDebitos(
  userId: number,
  input: {
    sessaoPreviaId: string;
    hashArquivo: string;
    linha: number;
    campos: Record<string, string>;
  },
): ResultadoCorrecaoPreviewDebitos {
  const resultado = corrigirLinhaPreviaDebitos(userId, input, adaptadorImportacaoDebitos);
  const preview = mapPreview(resultado.preview, adaptadorImportacaoDebitos.modulo, {
    sessaoPreviaId: input.sessaoPreviaId,
    userId,
    hashArquivo: input.hashArquivo,
  });
  const linhaSerializada = preview.linhas.find((item) => item.linha === input.linha);
  if (!linhaSerializada) {
    throw new ImportacaoCentroError("Linha não encontrada após correção.", 500);
  }
  return {
    preview,
    linha: linhaSerializada,
    historicoCorrecoes: resultado.historicoCorrecoes,
    correcaoAceita: resultado.correcaoAceita,
  };
}

export async function confirmarImportacaoDebitos(
  userId: number,
  input: {
    origem: string;
    arquivo?: string;
    conteudo?: string;
    processoId?: string;
    hashArquivo?: string;
    decisoesLinha?: import("@/lib/importacao-centro/detecao-duplicidades").DecisaoLinhaImportacao[];
    confirmacaoExplicita?: boolean;
    cienciaImportacaoParcial?: boolean;
    linhasIgnoradas?: number[];
  },
  meta?: { ip?: string; userAgent?: string },
): Promise<ResultadoConfirmacaoDebitos> {
  const resultado = await confirmarImportacaoCentral(
    adaptadorImportacaoDebitos,
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
}

export { listarImportacoesHistorico as listarImportacoes } from "@/lib/importacoes/historico-service";
