import {
  adaptadorImportacaoCondominios,
  adaptadorImportacaoResponsaveis,
  adaptadorImportacaoUnidades,
  confirmarImportacaoCentral,
  previewImportacaoCentral,
  type EntradaConfirmacaoImportacao,
  type EntradaImportacaoArquivo,
  type MetaExecucaoImportacao,
  type PreviewImportacaoCentral,
  type ResultadoConfirmacaoCentral,
} from "@/lib/importacao-centro";

/** Prévia de importação de condomínios via infraestrutura central (sem gravar). */
export async function previewImportacaoCondominios(
  userId: number,
  input: EntradaImportacaoArquivo,
): Promise<PreviewImportacaoCentral> {
  const { preview } = await previewImportacaoCentral(adaptadorImportacaoCondominios, userId, input);
  return preview;
}

export async function confirmarImportacaoCondominios(
  userId: number,
  input: EntradaConfirmacaoImportacao,
  meta?: MetaExecucaoImportacao,
): Promise<ResultadoConfirmacaoCentral> {
  return confirmarImportacaoCentral(adaptadorImportacaoCondominios, userId, input, meta);
}

export async function previewImportacaoUnidades(
  userId: number,
  input: EntradaImportacaoArquivo,
): Promise<PreviewImportacaoCentral> {
  const { preview } = await previewImportacaoCentral(adaptadorImportacaoUnidades, userId, input);
  return preview;
}

export async function confirmarImportacaoUnidades(
  userId: number,
  input: EntradaConfirmacaoImportacao,
  meta?: MetaExecucaoImportacao,
): Promise<ResultadoConfirmacaoCentral> {
  return confirmarImportacaoCentral(adaptadorImportacaoUnidades, userId, input, meta);
}

export async function previewImportacaoResponsaveis(
  userId: number,
  input: EntradaImportacaoArquivo,
): Promise<PreviewImportacaoCentral> {
  const { preview } = await previewImportacaoCentral(adaptadorImportacaoResponsaveis, userId, input);
  return preview;
}

export async function confirmarImportacaoResponsaveis(
  userId: number,
  input: EntradaConfirmacaoImportacao,
  meta?: MetaExecucaoImportacao,
): Promise<ResultadoConfirmacaoCentral> {
  return confirmarImportacaoCentral(adaptadorImportacaoResponsaveis, userId, input, meta);
}
