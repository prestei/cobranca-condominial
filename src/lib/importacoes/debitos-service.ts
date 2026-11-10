import { adaptadorImportacaoDebitos } from "@/lib/importacao-centro/adaptadores/debitos";
import { corrigirLinhaPreviaDebitos } from "@/lib/importacao-centro/correcao-previa/servico";
import type { RegistroHistoricoCorrecaoPrevia } from "@/lib/importacao-centro/correcao-previa/types";
import type { DebitoImportRow } from "@/lib/importacoes/importar-debitos-planilha";
import {
  criarServicoImportacaoModulo,
  ImportacaoCentroError,
  mapearPreviewImportacaoModulo,
  type PreviewImportacaoModulo,
  type ResultadoConfirmacaoModulo,
} from "@/lib/importacoes/preview-importacao-modulo";

export { ImportacaoCentroError as ImportacaoDebitosError };

export type LinhaPreviewImportacaoDebito = PreviewImportacaoModulo["linhas"][number] & {
  situacao: "novo" | "atualizacao" | "duplicado" | "erro" | "manual_protegido" | "ignorado" | "revisao";
};

export type PreviewImportacaoDebitos = PreviewImportacaoModulo & {
  linhas: LinhaPreviewImportacaoDebito[];
  amostraValida: LinhaPreviewImportacaoDebito[];
};

export type ResultadoCorrecaoPreviewDebitos = {
  preview: PreviewImportacaoDebitos;
  linha: LinhaPreviewImportacaoDebito;
  historicoCorrecoes: RegistroHistoricoCorrecaoPrevia[];
  correcaoAceita: boolean;
};

export type ResultadoConfirmacaoDebitos = ResultadoConfirmacaoModulo;

const servico = criarServicoImportacaoModulo("debitos");

export const previewImportacaoDebitos = servico.preview as (
  userId: number,
  input: Parameters<typeof servico.preview>[1],
) => Promise<PreviewImportacaoDebitos>;

export const confirmarImportacaoDebitos = servico.confirmar;

export async function corrigirLinhaPreviewImportacaoDebitos(
  userId: number,
  input: {
    sessaoPreviaId: string;
    hashArquivo: string;
    linha: number;
    campos: Record<string, string>;
  },
): Promise<ResultadoCorrecaoPreviewDebitos> {
  const resultado = await corrigirLinhaPreviaDebitos(userId, input, adaptadorImportacaoDebitos);
  const preview = mapearPreviewImportacaoModulo(resultado.preview, "debitos", {
    sessaoPreviaId: input.sessaoPreviaId,
    userId,
    hashArquivo: input.hashArquivo,
  }) as PreviewImportacaoDebitos;
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

export { listarImportacoesHistorico as listarImportacoes } from "@/lib/importacoes/historico-service";
