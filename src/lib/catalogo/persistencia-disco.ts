import { mkdir, readFile, rename, writeFile } from "fs/promises";
import path from "path";
import type { Cadastros } from "@/data/catalogo";

const VERSAO_ARQUIVO = 1;

let persistenciaAgendada: ReturnType<typeof setTimeout> | null = null;

function persistenciaDesativada(): boolean {
  const env = process.env.NODE_ENV;
  if (env !== "development" && env !== "production") return true;
  if (process.env.CATALOGO_PERSISTIR === "0") return true;
  return false;
}

function caminhoArquivoCatalogo(): string {
  const custom = process.env.CATALOGO_DATA_PATH?.trim();
  if (custom) return path.resolve(custom);
  return path.join(process.cwd(), ".data", "catalogo-operacional.json");
}

/** Restaura o catálogo do disco na subida do servidor (antes das requisições). */
export async function hidratarCatalogoPersistido(
  substituir: (state: Cadastros) => void,
): Promise<void> {
  if (persistenciaDesativada()) return;

  const arquivo = caminhoArquivoCatalogo();
  let raw: string;
  try {
    raw = await readFile(arquivo, "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return;
    console.error("[catalogo] Não foi possível ler a persistência em disco:", error);
    return;
  }

  try {
    const parsed = JSON.parse(raw) as { versao?: number; state?: Cadastros };
    if (parsed.versao !== VERSAO_ARQUIVO || !parsed.state) {
      console.warn("[catalogo] Arquivo de persistência ignorado (versão ou formato inválido).");
      return;
    }
    substituir(parsed.state);
    console.info(`[catalogo] Estado restaurado de ${arquivo}`);
  } catch (error) {
    console.error("[catalogo] Falha ao interpretar persistência em disco:", error);
  }
}

export function agendarPersistenciaCatalogo(obterEstado: () => Cadastros, pular: () => boolean): void {
  if (typeof window !== "undefined") return;
  if (persistenciaDesativada() || pular()) return;

  if (persistenciaAgendada) clearTimeout(persistenciaAgendada);
  persistenciaAgendada = setTimeout(() => {
    persistenciaAgendada = null;
    void gravarCatalogoEmDisco(obterEstado());
  }, 300);
}

async function gravarCatalogoEmDisco(state: Cadastros): Promise<void> {
  const arquivo = caminhoArquivoCatalogo();
  const diretorio = path.dirname(arquivo);
  const temporario = `${arquivo}.${process.pid}.tmp`;

  try {
    await mkdir(diretorio, { recursive: true });
    const payload = JSON.stringify({
      versao: VERSAO_ARQUIVO,
      gravadoEm: new Date().toISOString(),
      state,
    });
    await writeFile(temporario, payload, "utf8");
    await rename(temporario, arquivo);
  } catch (error) {
    console.error("[catalogo] Falha ao gravar persistência em disco:", error);
  }
}
