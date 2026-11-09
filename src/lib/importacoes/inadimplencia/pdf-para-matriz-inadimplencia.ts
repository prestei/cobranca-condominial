import { extrairTextoLegivelPdf } from "@/lib/importacoes/inadimplencia/extrair-texto-pdf";
import {
  interpretarTextoRelatorioInadimplenciaGestao,
  textoPareceRelatorioInadimplenciaGestao,
  type ResultadoInterpretacaoRelatorioInadimplencia,
} from "@/lib/importacoes/inadimplencia/interpretar-relatorio-gestao-condominial";

export async function interpretarPdfInadimplencia(
  buffer: Buffer,
): Promise<ResultadoInterpretacaoRelatorioInadimplencia | null> {
  const { texto } = await extrairTextoLegivelPdf(buffer);
  if (!textoPareceRelatorioInadimplenciaGestao(texto)) {
    return null;
  }
  return interpretarTextoRelatorioInadimplenciaGestao(texto);
}
