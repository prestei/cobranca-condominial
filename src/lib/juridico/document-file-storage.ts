import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
function diretorioBase(): string {
  return path.join(process.cwd(), "data", "legal-documents");
}

function sanitizarNomeArquivo(nome: string): string {
  const base = nome.trim().split(/[/\\]/).pop() ?? "arquivo";
  return base.replace(/[^\w.\-()áàâãéèêíìîóòôõúùûçÁÀÂÃÉÈÊÍÌÎÓÒÔÕÚÙÛÇ\s-]/g, "_").slice(0, 180);
}

/** Chave interna persistida em `referencia_arquivo` (não expor caminho absoluto). */
export function chaveArmazenamento(encaminhamentoId: string, documentoId: string, nomeArquivo: string): string {
  const seguro = sanitizarNomeArquivo(nomeArquivo);
  return path.posix.join(encaminhamentoId, documentoId, seguro);
}

function caminhoAbsoluto(chave: string): string {
  const relativo = chave.split("/").join(path.sep);
  return path.join(diretorioBase(), relativo);
}

export async function salvarArquivoJuridico(
  chave: string,
  buffer: Buffer,
): Promise<void> {
  const destino = caminhoAbsoluto(chave);
  await mkdir(path.dirname(destino), { recursive: true, mode: 0o700 });
  await writeFile(destino, buffer, { mode: 0o600 });
}

export async function lerArquivoJuridico(chave: string): Promise<Buffer> {
  const destino = caminhoAbsoluto(chave);
  return readFile(destino);
}

export function nomeArquivoDaChave(chave: string): string {
  const partes = chave.split("/");
  return partes[partes.length - 1] ?? "arquivo";
}