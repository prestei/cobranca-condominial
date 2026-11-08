import type { AdaptadorImportacao, EntradaImportacaoArquivo } from "@/lib/importacao-centro/types";
import { ImportacaoCentroError } from "@/lib/importacao-centro/types";

export function validarEntradaLeitura(
  input: EntradaImportacaoArquivo,
  adapter: Pick<AdaptadorImportacao<unknown, unknown>, "validarOrigem">,
): void {
  const origem = input.origem?.trim() ?? "";
  const erroOrigem = adapter.validarOrigem(origem);
  if (erroOrigem) {
    throw new ImportacaoCentroError(erroOrigem, 400);
  }

  const conteudo = input.conteudo ?? "";
  const matriz = input.matrizPlanilha ?? [];
  const temProcesso = Boolean(input.processoId?.trim());
  if (!conteudo.trim() && matriz.length === 0 && !temProcesso) {
    throw new ImportacaoCentroError("Envie o conteúdo do arquivo.", 400);
  }
}
