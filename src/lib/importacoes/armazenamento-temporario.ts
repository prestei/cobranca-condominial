import { mkdir, rm, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import os from "node:os";
import path from "node:path";
import type { MetadadosRelatorioInadimplenciaLido } from "@/lib/importacoes/ler-conteudo-arquivo";
import { LIMITES_ARQUIVO_IMPORTACAO, type FormatoArquivoImportacao, type ModuloImportacaoArquivo } from "@/lib/importacoes/limites";

export type ProcessoArquivoImportacao = {
  id: string;
  userId: number;
  modulo: ModuloImportacaoArquivo;
  nomeArquivo: string;
  formato: FormatoArquivoImportacao;
  hashArquivo: string;
  caminhoAbsoluto: string;
  tamanhoBytes: number;
  criadoEm: number;
  conteudoTexto?: string;
  matrizPlanilha?: string[][];
  quantidadeRegistros?: number;
  metadadosRelatorio?: MetadadosRelatorioInadimplenciaLido;
};

const processos = new Map<string, ProcessoArquivoImportacao>();
let limpezaAgendada = false;

function diretorioBaseImportacoes() {
  return path.join(os.tmpdir(), "lc-importacoes");
}

export function hashBufferArquivo(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export async function criarProcessoArquivoTemporario(input: {
  userId: number;
  modulo: ModuloImportacaoArquivo;
  nomeArquivo: string;
  formato: FormatoArquivoImportacao;
  buffer: Buffer;
  hashArquivo: string;
  conteudoTexto?: string;
  matrizPlanilha?: string[][];
  quantidadeRegistros?: number;
  metadadosRelatorio?: MetadadosRelatorioInadimplenciaLido;
}): Promise<ProcessoArquivoImportacao> {
  const id = randomUUID();
  const base = diretorioBaseImportacoes();
  await mkdir(base, { recursive: true, mode: 0o700 });

  const nomeSeguro = `${id}.bin`;
  const caminhoAbsoluto = path.join(base, nomeSeguro);
  await writeFile(caminhoAbsoluto, input.buffer, { mode: 0o600 });

  const processo: ProcessoArquivoImportacao = {
    id,
    userId: input.userId,
    modulo: input.modulo,
    nomeArquivo: input.nomeArquivo,
    formato: input.formato,
    hashArquivo: input.hashArquivo,
    caminhoAbsoluto,
    tamanhoBytes: input.buffer.length,
    criadoEm: Date.now(),
    conteudoTexto: input.conteudoTexto,
    matrizPlanilha: input.matrizPlanilha,
    quantidadeRegistros: input.quantidadeRegistros,
    metadadosRelatorio: input.metadadosRelatorio,
  };
  processos.set(id, processo);
  agendarLimpezaPeriodica();
  return processo;
}

export function obterProcessoArquivoTemporario(processoId: string, userId: number): ProcessoArquivoImportacao | null {
  const processo = processos.get(processoId);
  if (!processo || processo.userId !== userId) return null;
  if (Date.now() - processo.criadoEm > LIMITES_ARQUIVO_IMPORTACAO.retencaoTemporariaMs) {
    void removerProcessoArquivoTemporario(processoId);
    return null;
  }
  return processo;
}

export async function removerProcessoArquivoTemporario(processoId: string) {
  const processo = processos.get(processoId);
  if (!processo) return;
  processos.delete(processoId);
  try {
    await rm(processo.caminhoAbsoluto, { force: true });
  } catch {
    // falha de limpeza não impede o fluxo principal
  }
}

function agendarLimpezaPeriodica() {
  if (limpezaAgendada) return;
  limpezaAgendada = true;
  setInterval(() => {
    void limparProcessosExpirados();
  }, LIMITES_ARQUIVO_IMPORTACAO.intervaloLimpezaMs).unref?.();
}

export async function limparProcessosExpirados() {
  const agora = Date.now();
  const expirados = [...processos.values()].filter(
    (item) => agora - item.criadoEm > LIMITES_ARQUIVO_IMPORTACAO.retencaoTemporariaMs,
  );
  await Promise.all(expirados.map((item) => removerProcessoArquivoTemporario(item.id)));
}

/** Apenas para testes. */
export function _limparTodosProcessosTemporariosParaTeste() {
  processos.clear();
}
