import type { FormatoArquivoImportacao } from "@/lib/importacoes/limites";

export type AssinaturaArquivo = {
  formato: FormatoArquivoImportacao;
  confianca: "assinatura" | "conteudo";
};

function inicioAscii(buffer: Buffer, quantidade: number, offset = 0): string {
  const fatia = buffer.subarray(offset, Math.min(buffer.length, offset + quantidade));
  return fatia.toString("latin1");
}

function offsetAposBom(buffer: Buffer): number {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) return 3;
  return 0;
}

/** Compound File Binary (Excel 97-2003 / XLSX criptografado). */
export function eAssinaturaOleComposto(buffer: Buffer): boolean {
  return (
    buffer.length >= 8 &&
    buffer[0] === 0xd0 &&
    buffer[1] === 0xcf &&
    buffer[2] === 0x11 &&
    buffer[3] === 0xe0 &&
    buffer[4] === 0xa1 &&
    buffer[5] === 0xb1 &&
    buffer[6] === 0x1a &&
    buffer[7] === 0xe1
  );
}

export function eAssinaturaExecutavel(buffer: Buffer): boolean {
  if (buffer.length >= 2 && buffer[0] === 0x4d && buffer[1] === 0x5a) return true;
  if (buffer.length >= 4 && buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    return true;
  }
  return false;
}

export function eAssinaturaZip(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;
}

function zipPareceXlsx(buffer: Buffer): boolean {
  const amostra = buffer.subarray(0, Math.min(buffer.length, 65536));
  return amostra.includes(Buffer.from("xl/"));
}

export function detectarFormatoPorAssinatura(buffer: Buffer): AssinaturaArquivo | null {
  if (buffer.length === 0) return null;
  if (eAssinaturaExecutavel(buffer) || eAssinaturaOleComposto(buffer)) return null;

  if (eAssinaturaZip(buffer)) {
    if (zipPareceXlsx(buffer)) return { formato: "xlsx", confianca: "assinatura" };
    return null;
  }

  const inicio = offsetAposBom(buffer);
  const prefixo = inicioAscii(buffer, 8, inicio);
  if (prefixo.startsWith("%PDF-")) {
    return { formato: "pdf", confianca: "assinatura" };
  }

  const textoInicio = inicioAscii(buffer, 512, inicio).trimStart();
  if (textoInicio.startsWith("<?xml") || textoInicio.includes("<Workbook")) {
    return { formato: "xls-xml", confianca: "assinatura" };
  }

  if (pareceTextoPlanilha(buffer.subarray(inicio))) {
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
  const inicio = offsetAposBom(buffer);
  if (!inicioAscii(buffer, 5, inicio).startsWith("%PDF-")) return true;
  const fim = buffer.subarray(Math.max(0, buffer.length - 2048)).toString("latin1");
  return !/%%EOF/.test(fim) && buffer.length > 128;
}
