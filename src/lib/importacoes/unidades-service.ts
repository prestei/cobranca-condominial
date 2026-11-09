import { criarServicoImportacaoModulo, ImportacaoCentroError } from "@/lib/importacoes/preview-importacao-modulo";

const servico = criarServicoImportacaoModulo("unidades");

export { ImportacaoCentroError as ImportacaoUnidadesError };
export type { PreviewImportacaoModulo as PreviewImportacaoUnidades, ResultadoConfirmacaoModulo as ResultadoConfirmacaoUnidades } from "@/lib/importacoes/preview-importacao-modulo";

export const previewImportacaoUnidades = servico.preview;
export const confirmarImportacaoUnidades = servico.confirmar;
