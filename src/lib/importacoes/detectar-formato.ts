import type { FormatoArquivoImportacao } from "@/lib/importacoes/limites";

export type AssinaturaArquivo = {
  formato: FormatoArquivoImportacao;
  confianca: "assinatura" | "conteudo";
};

function inicioAscii(buffer: Buffer, quantidade: number): string {
  const fatia = buffer.subarray(0, Math.min(buffer.length, quantidade));
  return fatia.toString("latin1");
}

export function detectarFormatoPorAssinatura(buffer: Buffer): AssinaturaArquivo | null {
  if (buffer.length === 0) return null;

  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return { formato: "xlsx", confianca: "assinatura" };
  }

  const prefixo = inicioAscii(buffer, 8);
  if (prefixo.startsWith("%PDF-")) {
    return { formato: "pdf", confianca: "assinatura" };
  }

  const textoInicio = inicioAscii(buffer, 512).trimStart();
  if (textoInicio.startsWith("<?xml") || textoInicio.includes("<Workbook")) {
    return { formato: "xls-xml", confianca: "assinatura" };
  }

  if (pareceTextoPlanilha(buffer)) {
    return { formato: "csv", confianca: "conteudo" };
  }

  return null;
}

function pareceTextoPlanilha(buffer: Buffer): boolean {
  if (buffer.includes(0)) return false;
  const amostra = buffer.subarray(0, Math.min(buffer.length, 4096));
  let imprimiveis = 0;
  for (const byte of amostra) {
    if (byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126) || byte >= 128) imprimiveis += 1;
  }
  return amostra.length > 0 && imprimiveis / amostra.length >= 0.9;
}

export function pdfProtegidoOuCriptografado(buffer: Buffer): boolean {
  const trecho = buffer.subarray(0, Math.min(buffer.length, 65536)).toString("latin1");
  return /\/Encrypt\b/i.test(trecho);
}

export function pdfPareceCorrompido(buffer: Buffer): boolean {
  if (!inicioAscii(buffer, 5).startsWith("%PDF-")) return true;
  const fim = buffer.subarray(Math.max(0, buffer.length - 2048)).toString("latin1");
  return !/%%EOF/.test(fim) && buffer.length > 128;
}
