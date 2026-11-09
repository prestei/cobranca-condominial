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

const MAX_ENTRADAS = 256;
const MAX_DESCOMPRIMIDO_ENTRADA = 8 * 1024 * 1024;
const MAX_DESCOMPRIMIDO_TOTAL = 32 * 1024 * 1024;
const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;
const SIG_DATA_DESC = 0x08074b50;

function nomeZipSeguro(nome: string): boolean {
  if (!nome || nome.includes("\0")) return false;
  if (nome.startsWith("/") || nome.startsWith("\\")) return false;
  const partes = nome.split(/[/\\]/);
  return partes.every((parte) => parte !== ".." && parte !== "");
}

function descomprimir(metodo: number, fatia: Buffer): Buffer {
  if (metodo === 0) return fatia;
  if (metodo === 8) {
    try {
      return inflateRawSync(fatia, { maxOutputLength: MAX_DESCOMPRIMIDO_ENTRADA });
    } catch {
      throw new ZipMinimoError("Não foi possível descompactar o arquivo.");
    }
  }
  throw new ZipMinimoError("Formato de compactação não suportado.");
}

function validarEntrada(nome: string, dados: Buffer, totalDescomprimido: number): number {
  if (!nomeZipSeguro(nome)) {
    throw new ZipMinimoError("Arquivo compactado com caminho inválido.");
  }
  if (dados.length > MAX_DESCOMPRIMIDO_ENTRADA) {
    throw new ZipMinimoError("Arquivo compactado excede o limite de descompressão.");
  }
  const proximo = totalDescomprimido + dados.length;
  if (proximo > MAX_DESCOMPRIMIDO_TOTAL) {
    throw new ZipMinimoError("Arquivo compactado excede o limite de descompressão.");
  }
  return proximo;
}

function encontrarEocd(buffer: Buffer): number {
  const minimo = Math.max(0, buffer.length - 22 - 65535);
  for (let i = buffer.length - 22; i >= minimo; i -= 1) {
    if (buffer.readUInt32LE(i) !== SIG_EOCD) continue;
    const commentLen = buffer.readUInt16LE(i + 20);
    if (i + 22 + commentLen === buffer.length) return i;
  }
  return -1;
}

function lerPeloDiretorioCentral(buffer: Buffer, eocd: number): EntradaZip[] | null {
  const discos = buffer.readUInt16LE(eocd + 4);
  const totalEntradas = buffer.readUInt16LE(eocd + 10);
  const tamanhoCd = buffer.readUInt32LE(eocd + 12);
  const offsetCd = buffer.readUInt32LE(eocd + 16);
  if (discos !== 0) return null;
  if (totalEntradas === 0xffff || tamanhoCd === 0xffffffff || offsetCd === 0xffffffff) {
    throw new ZipMinimoError("Arquivo compactado ZIP64 não é suportado.");
  }
  if (totalEntradas > MAX_ENTRADAS) {
    throw new ZipMinimoError("Arquivo compactado excede o limite de entradas.");
  }
  if (offsetCd + tamanhoCd > buffer.length) {
    throw new ZipMinimoError("Arquivo compactado corrompido.");
  }

  const entradas: EntradaZip[] = [];
  let cursor = offsetCd;
  let totalDescomprimido = 0;

  for (let i = 0; i < totalEntradas; i += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== SIG_CENTRAL) {
      throw new ZipMinimoError("Arquivo compactado corrompido.");
    }
    const flags = buffer.readUInt16LE(cursor + 8);
    if (flags & 0x1) {
      throw new ZipMinimoError("Arquivo compactado protegido por senha.");
    }
    const metodo = buffer.readUInt16LE(cursor + 10);
    const comprimido = buffer.readUInt32LE(cursor + 20);
    const nomeLen = buffer.readUInt16LE(cursor + 28);
    const extraLen = buffer.readUInt16LE(cursor + 30);
    const commentLen = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const nome = buffer.subarray(cursor + 46, cursor + 46 + nomeLen).toString("utf8");
    cursor += 46 + nomeLen + extraLen + commentLen;

    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== SIG_LOCAL) {
      throw new ZipMinimoError("Arquivo compactado corrompido.");
    }
    const localNomeLen = buffer.readUInt16LE(localOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localOffset + 28);
    const dadosInicio = localOffset + 30 + localNomeLen + localExtraLen;
    const dadosFim = dadosInicio + comprimido;
    if (dadosFim > buffer.length) throw new ZipMinimoError("Arquivo compactado corrompido.");

    const dados = descomprimir(metodo, buffer.subarray(dadosInicio, dadosFim));
    totalDescomprimido = validarEntrada(nome, dados, totalDescomprimido);
    entradas.push({ nome, dados });
  }

  return entradas;
}

function lerSequencialLocal(buffer: Buffer): EntradaZip[] {
  const entradas: EntradaZip[] = [];
  let offset = 0;
  let totalDescomprimido = 0;

  while (offset + 30 <= buffer.length) {
    const assinatura = buffer.readUInt32LE(offset);
    if (assinatura !== SIG_LOCAL) break;

    if (entradas.length >= MAX_ENTRADAS) {
      throw new ZipMinimoError("Arquivo compactado excede o limite de entradas.");
    }

    const flags = buffer.readUInt16LE(offset + 6);
    if (flags & 0x1) {
      throw new ZipMinimoError("Arquivo compactado protegido por senha.");
    }

    const metodo = buffer.readUInt16LE(offset + 8);
    let comprimido = buffer.readUInt32LE(offset + 18);
    const nomeLen = buffer.readUInt16LE(offset + 26);
    const extraLen = buffer.readUInt16LE(offset + 28);
    const nomeInicio = offset + 30;
    const nomeFim = nomeInicio + nomeLen;
    if (nomeFim > buffer.length) throw new ZipMinimoError("Arquivo compactado corrompido.");

    const nome = buffer.subarray(nomeInicio, nomeFim).toString("utf8");
    const dadosInicio = nomeFim + extraLen;

    if (flags & 0x8 && comprimido === 0) {
      throw new ZipMinimoError("Arquivo compactado corrompido.");
    }

    const dadosFim = dadosInicio + comprimido;
    if (dadosFim > buffer.length) throw new ZipMinimoError("Arquivo compactado corrompido.");

    const fatia = buffer.subarray(dadosInicio, dadosFim);
    const dados = descomprimir(metodo, fatia);
    totalDescomprimido = validarEntrada(nome, dados, totalDescomprimido);
    entradas.push({ nome, dados });

    offset = dadosFim;
    if (flags & 0x8) {
      if (offset + 4 <= buffer.length && buffer.readUInt32LE(offset) === SIG_DATA_DESC) {
        offset += 16;
      } else {
        offset += 12;
      }
    }
  }

  if (entradas.length === 0) throw new ZipMinimoError("Arquivo compactado vazio ou inválido.");
  return entradas;
}

/** Leitor ZIP restrito (armazenado ou DEFLATE) para pacotes OOXML pequenos. Não executa conteúdo. */
export function lerEntradasZip(buffer: Buffer): EntradaZip[] {
  const eocd = encontrarEocd(buffer);
  if (eocd >= 0) {
    const peloCd = lerPeloDiretorioCentral(buffer, eocd);
    if (peloCd && peloCd.length > 0) return peloCd;
  }
  return lerSequencialLocal(buffer);
}
