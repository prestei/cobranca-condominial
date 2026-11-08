import { extrairTextoLegivelPdf } from "@/lib/importacoes/inadimplencia/extrair-texto-pdf";
import {
  interpretarTextoRelatorioInadimplenciaGestao,
  textoPareceRelatorioInadimplenciaGestao,
  type ResultadoInterpretacaoRelatorioInadimplencia,
} from "@/lib/importacoes/inadimplencia/interpretar-relatorio-gestao-condominial";

export function interpretarPdfInadimplencia(
  buffer: Buffer,
): ResultadoInterpretacaoRelatorioInadimplencia | null {
  const { texto } = extrairTextoLegivelPdf(buffer);
  if (!textoPareceRelatorioInadimplenciaGestao(texto)) {
    return null;
  }
  return interpretarTextoRelatorioInadimplenciaGestao(texto);
}
