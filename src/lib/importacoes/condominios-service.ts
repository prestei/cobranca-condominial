import { adaptadorImportacaoCondominios } from "@/lib/importacao-centro/adaptadores/condominios";
import { criarServicoImportacaoModulo, ImportacaoCentroError } from "@/lib/importacoes/preview-importacao-modulo";

const servico = criarServicoImportacaoModulo(adaptadorImportacaoCondominios);

export { ImportacaoCentroError as ImportacaoCondominiosError };
export type { PreviewImportacaoModulo as PreviewImportacaoCondominios, ResultadoConfirmacaoModulo as ResultadoConfirmacaoCondominios } from "@/lib/importacoes/preview-importacao-modulo";

export const previewImportacaoCondominios = servico.preview;
export const confirmarImportacaoCondominios = servico.confirmar;
