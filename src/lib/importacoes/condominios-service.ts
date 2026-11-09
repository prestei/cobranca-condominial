import { criarServicoImportacaoModulo, ImportacaoCentroError } from "@/lib/importacoes/preview-importacao-modulo";

const servico = criarServicoImportacaoModulo("condominios");

export { ImportacaoCentroError as ImportacaoCondominiosError };
export type { PreviewImportacaoModulo as PreviewImportacaoCondominios, ResultadoConfirmacaoModulo as ResultadoConfirmacaoCondominios } from "@/lib/importacoes/preview-importacao-modulo";

export const previewImportacaoCondominios = servico.preview;
export const confirmarImportacaoCondominios = servico.confirmar;
