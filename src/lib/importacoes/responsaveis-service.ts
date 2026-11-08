import { adaptadorImportacaoResponsaveis } from "@/lib/importacao-centro/adaptadores/responsaveis";
import { criarServicoImportacaoModulo, ImportacaoCentroError } from "@/lib/importacoes/preview-importacao-modulo";

const servico = criarServicoImportacaoModulo(adaptadorImportacaoResponsaveis);

export { ImportacaoCentroError as ImportacaoResponsaveisError };
export type { PreviewImportacaoModulo as PreviewImportacaoResponsaveis, ResultadoConfirmacaoModulo as ResultadoConfirmacaoResponsaveis } from "@/lib/importacoes/preview-importacao-modulo";

export const previewImportacaoResponsaveis = servico.preview;
export const confirmarImportacaoResponsaveis = servico.confirmar;
