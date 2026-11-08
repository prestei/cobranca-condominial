import { montarResumoAprovacaoImportacao, type ResumoAprovacaoImportacao } from "@/lib/importacao-centro/resumo-aprovacao";
import type { EntradaConfirmacaoImportacao, PreviewImportacaoCentral } from "@/lib/importacao-centro/types";
import { ImportacaoCentroError } from "@/lib/importacao-centro/types";

export function montarResumoAprovacaoDoPreview(
  moduloDestino: string,
  preview: PreviewImportacaoCentral,
  linhasIgnoradas?: number[],
): ResumoAprovacaoImportacao {
  return montarResumoAprovacaoImportacao({
    moduloDestino,
    preview,
    linhasIgnoradas,
  });
}

export function validarAprovacao(
  preview: PreviewImportacaoCentral,
  input: EntradaConfirmacaoImportacao,
  moduloDestino: string,
): ResumoAprovacaoImportacao {
  if (input.hashArquivo && input.hashArquivo !== preview.hashArquivo) {
    throw new ImportacaoCentroError("O arquivo não confere com a prévia. Refaça a validação.", 409);
  }

  if (input.confirmacaoExplicita !== true) {
    throw new ImportacaoCentroError("É necessário confirmar explicitamente a importação antes de gravar.", 400);
  }

  const resumo = montarResumoAprovacaoImportacao({
    moduloDestino,
    preview,
    linhasIgnoradas: input.linhasIgnoradas,
  });

  if (!resumo.podeConfirmar) {
    throw new ImportacaoCentroError(
      resumo.motivoBloqueio ?? "Não é possível confirmar esta importação.",
      400,
    );
  }

  if (resumo.importacaoParcial && input.cienciaImportacaoParcial !== true) {
    throw new ImportacaoCentroError(
      "Confirme que está ciente de que parte dos registros não será gravada nesta importação.",
      400,
    );
  }

  return resumo;
}
