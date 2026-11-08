import { obterProcessoArquivoTemporario } from "@/lib/importacoes/armazenamento-temporario";
import type { MetadadosRelatorioInadimplenciaLido } from "@/lib/importacoes/ler-conteudo-arquivo";
import { hashConteudoArquivo } from "@/lib/importacoes/hash-arquivo";
import { ImportacaoCentroError } from "@/lib/importacao-centro/types";
import { assertPermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
import { FORMATOS_AUTORIZADOS_POR_MODULO, type ModuloImportacaoArquivo } from "@/lib/importacoes/limites";
import { RecebimentoArquivoError, receberArquivoImportacao, receberArquivoLegadoTexto } from "@/lib/importacoes/receber-arquivo";

function moduloComRecebimentoSeguro(modulo: string): modulo is ModuloImportacaoArquivo {
  return Object.hasOwn(FORMATOS_AUTORIZADOS_POR_MODULO, modulo);
}

export type EntradaImportacaoResolvida = {
  origem: string;
  arquivo: string;
  conteudo: string;
  hashArquivo: string;
  processoId?: string;
  matrizPlanilha?: string[][];
  metadadosRelatorio?: MetadadosRelatorioInadimplenciaLido;
};

export async function resolverEntradaImportacao(
  modulo: string,
  userId: number,
  input: {
    origem: string;
    arquivo?: string;
    conteudo?: string;
    processoId?: string;
    hashArquivo?: string;
  },
): Promise<EntradaImportacaoResolvida> {
  const origem = input.origem.trim();

  if (input.processoId?.trim()) {
    const processo = obterProcessoArquivoTemporario(input.processoId.trim(), userId);
    if (!processo || processo.modulo !== modulo || !moduloComRecebimentoSeguro(modulo)) {
      throw new ImportacaoCentroError("Processo de importação inválido ou expirado. Envie o arquivo novamente.", 400);
    }
    if (input.hashArquivo && input.hashArquivo !== processo.hashArquivo) {
      throw new ImportacaoCentroError("O arquivo não confere com a validação anterior.", 409);
    }
    return {
      origem,
      arquivo: processo.nomeArquivo,
      conteudo: processo.conteudoTexto ?? "",
      hashArquivo: processo.hashArquivo,
      processoId: processo.id,
      matrizPlanilha: processo.matrizPlanilha,
      metadadosRelatorio: processo.metadadosRelatorio,
    };
  }

  const arquivo = input.arquivo?.trim() ?? "";
  const conteudo = input.conteudo ?? "";
  if (!conteudo.trim()) {
    throw new ImportacaoCentroError("Envie o arquivo ou o identificador do processo de importação.", 400);
  }

  if (!moduloComRecebimentoSeguro(modulo)) {
    return {
      origem,
      arquivo: arquivo || "importacao.csv",
      conteudo,
      hashArquivo: hashConteudoArquivo(conteudo),
    };
  }

  try {
    const recebido = await receberArquivoLegadoTexto({
      userId,
      modulo,
      nomeArquivo: arquivo || `importacao-${modulo}.csv`,
      conteudo,
    });
    const processo = obterProcessoArquivoTemporario(recebido.processoId, userId);
    return {
      origem,
      arquivo: recebido.nomeArquivo,
      conteudo,
      hashArquivo: recebido.hashArquivo,
      processoId: recebido.processoId,
      matrizPlanilha: processo?.matrizPlanilha,
      metadadosRelatorio: processo?.metadadosRelatorio,
    };
  } catch (error) {
    if (error instanceof RecebimentoArquivoError) {
      throw new ImportacaoCentroError(error.message, error.status);
    }
    throw error;
  }
}

export async function receberUploadImportacao(
  modulo: ModuloImportacaoArquivo,
  userId: number,
  input: { nomeArquivo: string; buffer: Buffer; mimeDeclarado?: string },
) {
  assertPermissaoAcaoImportacao(userId, "iniciarImportacao");
  try {
    return await receberArquivoImportacao({
      userId,
      modulo,
      nomeArquivo: input.nomeArquivo,
      buffer: input.buffer,
      mimeDeclarado: input.mimeDeclarado,
    });
  } catch (error) {
    if (error instanceof RecebimentoArquivoError) {
      throw new ImportacaoCentroError(error.message, error.status);
    }
    throw error;
  }
}
