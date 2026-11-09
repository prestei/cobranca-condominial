import { mkdir, rm, writeFile, chmod, readdir, stat } from "node:fs/promises";
import { rmSync } from "node:fs";
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
  return path.resolve(os.tmpdir(), "lc-importacoes");
}

function caminhoTemporarioSeguro(id: string): string {
  const base = diretorioBaseImportacoes();
  const caminhoAbsoluto = path.resolve(base, `${id}.bin`);
  const relativo = path.relative(base, caminhoAbsoluto);
  if (relativo.startsWith("..") || path.isAbsolute(relativo)) {
    throw new Error("caminho_temporario_invalido");
  }
  return caminhoAbsoluto;
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
  await chmod(base, 0o700).catch(() => undefined);

  const caminhoAbsoluto = caminhoTemporarioSeguro(id);
  await writeFile(caminhoAbsoluto, input.buffer, { mode: 0o600 });
  await chmod(caminhoAbsoluto, 0o600).catch(() => undefined);

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
  await limparArquivosOrfaosNoDisco();
}

async function limparArquivosOrfaosNoDisco() {
  const base = diretorioBaseImportacoes();
  let nomes: string[] = [];
  try {
    nomes = await readdir(base);
  } catch {
    return;
  }
  const vivos = new Set([...processos.values()].map((item) => path.basename(item.caminhoAbsoluto)));
  const agora = Date.now();
  await Promise.all(
    nomes.map(async (nome) => {
      if (!/^[0-9a-f-]{36}\.bin$/i.test(nome) || vivos.has(nome)) return;
      const caminho = path.resolve(base, nome);
      if (!caminho.startsWith(base + path.sep)) return;
      try {
        const info = await stat(caminho);
        if (agora - info.mtimeMs > LIMITES_ARQUIVO_IMPORTACAO.retencaoTemporariaMs) {
          await rm(caminho, { force: true });
        }
      } catch {
        // ignora arquivo removido concorrentemente
      }
    }),
  );
}

/** Apenas para testes. */
export function _limparTodosProcessosTemporariosParaTeste() {
  const caminhos = [...processos.values()].map((item) => item.caminhoAbsoluto);
  processos.clear();
  for (const caminho of caminhos) {
    try {
      rmSync(caminho, { force: true });
    } catch {
      // ignora falha de limpeza em teste
    }
  }
}
