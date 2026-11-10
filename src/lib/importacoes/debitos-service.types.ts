import type {
  PreviewImportacaoModulo,
  ResultadoConfirmacaoModulo,
} from "@/lib/importacoes/preview-importacao-modulo.types";
import type { RegistroHistoricoCorrecaoPrevia } from "@/lib/importacao-centro/correcao-previa/types";

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
