import { inflateRawSync } from "node:zlib";

export class ZipMinimoError extends Error {
  constructor(message: string) {
    super(message);
  }
}

type EntradaZip = {
  nome: string;
  dados: Buffer;
};

/** Leitor ZIP restrito (armazenado ou DEFLATE) para pacotes OOXML pequenos. */
export function lerEntradasZip(buffer: Buffer): EntradaZip[] {
  const entradas: EntradaZip[] = [];
  let offset = 0;

  while (offset + 30 <= buffer.length) {
    const assinatura = buffer.readUInt32LE(offset);
    if (assinatura !== 0x04034b50) break;

    const metodo = buffer.readUInt16LE(offset + 8);
    const nomeLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const comprimido = buffer.readUInt32LE(offset + 18);
    const nomeInicio = offset + 30;
    const nomeFim = nomeInicio + nomeLen;
    if (nomeFim > buffer.length) throw new ZipMinimoError("Arquivo compactado corrompido.");

    const nome = buffer.subarray(nomeInicio, nomeFim).toString("utf8");
    const dadosInicio = nomeFim + extraLen;
    const dadosFim = dadosInicio + comprimido;
    if (dadosFim > buffer.length) throw new ZipMinimoError("Arquivo compactado corrompido.");

    const fatia = buffer.subarray(dadosInicio, dadosFim);
    let dados: Buffer;
    if (metodo === 0) {
      dados = fatia;
    } else if (metodo === 8) {
      try {
        dados = inflateRawSync(fatia);
      } catch {
        throw new ZipMinimoError("Não foi possível descompactar o arquivo.");
      }
    } else {
      throw new ZipMinimoError("Formato de compactação não suportado.");
    }

    entradas.push({ nome, dados });
    offset = dadosFim;
  }

  if (entradas.length === 0) throw new ZipMinimoError("Arquivo compactado vazio ou inválido.");
  return entradas;
}
