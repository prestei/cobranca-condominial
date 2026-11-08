import { lerMatrizPlanilha } from "@/lib/planilha/ler-planilha";

/**
 * Leitura estrutural (CSV ;, XLS XML, XLSX ou matriz já validada no recebimento) sem persistência.
 */
export function lerArquivoImportacao(conteudo: string, matrizPreCarregada?: string[][]): string[][] {
  if (matrizPreCarregada?.length) return matrizPreCarregada;
  if (!conteudo?.trim()) {
    return [];
  }
  return lerMatrizPlanilha(conteudo);
}
