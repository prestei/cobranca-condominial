import { existsSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { mkdir, rm, writeFile, chmod, readdir, stat } from "node:fs/promises";
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

type ProcessoArquivoImportacaoSerializado = Omit<ProcessoArquivoImportacao, "caminhoAbsoluto">;

const CHAVE_MAPA_PROCESSOS_GLOBAL = "__lcImportacaoProcessosTemporarios";

function mapaProcessos(): Map<string, ProcessoArquivoImportacao> {
  const globalComMapa = globalThis as typeof globalThis & {
    [CHAVE_MAPA_PROCESSOS_GLOBAL]?: Map<string, ProcessoArquivoImportacao>;
  };
  if (!globalComMapa[CHAVE_MAPA_PROCESSOS_GLOBAL]) {
    globalComMapa[CHAVE_MAPA_PROCESSOS_GLOBAL] = new Map();
  }
  return globalComMapa[CHAVE_MAPA_PROCESSOS_GLOBAL]!;
}

const processos = mapaProcessos();
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

function caminhoMetaProcesso(id: string): string {
  const base = diretorioBaseImportacoes();
  const caminhoMeta = path.resolve(base, `${id}.meta.json`);
  const relativo = path.relative(base, caminhoMeta);
  if (relativo.startsWith("..") || path.isAbsolute(relativo)) {
    throw new Error("caminho_meta_invalido");
  }
  return caminhoMeta;
}

function carregarProcessoDoDisco(processoId: string): ProcessoArquivoImportacao | null {
  const caminhoBin = caminhoTemporarioSeguro(processoId);
  const caminhoMeta = caminhoMetaProcesso(processoId);
  if (!existsSync(caminhoBin) || !existsSync(caminhoMeta)) return null;
  try {
    const bruto = readFileSync(caminhoMeta, "utf8");
    const meta = JSON.parse(bruto) as ProcessoArquivoImportacaoSerializado;
    if (meta.id !== processoId) return null;
    return { ...meta, caminhoAbsoluto: caminhoBin };
  } catch {
    return null;
  }
}

async function persistirMetaProcesso(processo: ProcessoArquivoImportacao): Promise<void> {
  const { caminhoAbsoluto: _caminho, ...meta } = processo;
  const caminhoMeta = caminhoMetaProcesso(processo.id);
  await writeFile(caminhoMeta, JSON.stringify(meta), { mode: 0o600 });
  await chmod(caminhoMeta, 0o600).catch(() => undefined);
}

function processoExpirado(processo: ProcessoArquivoImportacao): boolean {
  return Date.now() - processo.criadoEm > LIMITES_ARQUIVO_IMPORTACAO.retencaoTemporariaMs;
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
  try {
    await persistirMetaProcesso(processo);
  } catch {
    processos.delete(id);
    await rm(caminhoAbsoluto, { force: true }).catch(() => undefined);
    throw new Error("falha_persistir_meta_processo");
  }
  agendarLimpezaPeriodica();
  return processo;
}

export function obterProcessoArquivoTemporario(processoId: string, userId: number): ProcessoArquivoImportacao | null {
  let processo = processos.get(processoId);
  if (!processo) {
    const recuperado = carregarProcessoDoDisco(processoId);
    if (recuperado) {
      processos.set(processoId, recuperado);
      processo = recuperado;
    }
  }
  if (!processo || processo.userId !== userId) return null;
  if (processoExpirado(processo)) {
    void removerProcessoArquivoTemporario(processoId);
    return null;
  }
  return processo;
}

async function removerArquivosProcessoNoDisco(processoId: string, caminhoBin?: string) {
  const bin = caminhoBin ?? caminhoTemporarioSeguro(processoId);
  const meta = caminhoMetaProcesso(processoId);
  await Promise.all([
    rm(bin, { force: true }).catch(() => undefined),
    rm(meta, { force: true }).catch(() => undefined),
  ]);
}

export async function removerProcessoArquivoTemporario(processoId: string) {
  const processo = processos.get(processoId) ?? carregarProcessoDoDisco(processoId);
  processos.delete(processoId);
  await removerArquivosProcessoNoDisco(processoId, processo?.caminhoAbsoluto);
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
  const vivosBin = new Set([...processos.values()].map((item) => path.basename(item.caminhoAbsoluto)));
  const vivosMeta = new Set([...processos.values()].map((item) => `${item.id}.meta.json`));
  const agora = Date.now();
  await Promise.all(
    nomes.map(async (nome) => {
      const bin = /^[0-9a-f-]{36}\.bin$/i.test(nome) && !vivosBin.has(nome);
      const meta = /^[0-9a-f-]{36}\.meta\.json$/i.test(nome) && !vivosMeta.has(nome);
      if (!bin && !meta) return;
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
export function _esvaziarMapaProcessosTemporariosParaTeste() {
  processos.clear();
}

/** Apenas para testes. */
export function _limparTodosProcessosTemporariosParaTeste() {
  const ids = new Set([...processos.keys()]);
  for (const processo of processos.values()) {
    ids.add(processo.id);
    try {
      rmSync(processo.caminhoAbsoluto, { force: true });
      rmSync(caminhoMetaProcesso(processo.id), { force: true });
    } catch {
      // ignora falha de limpeza em teste
    }
  }
  processos.clear();
  const base = diretorioBaseImportacoes();
  let nomes: string[] = [];
  try {
    nomes = readdirSync(base);
  } catch {
    return;
  }
  for (const nome of nomes) {
    if (!/^[0-9a-f-]{36}\.(bin|meta\.json)$/i.test(nome)) continue;
    try {
      rmSync(path.resolve(base, nome), { force: true });
    } catch {
      // ignora
    }
  }
}
