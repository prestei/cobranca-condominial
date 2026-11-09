import type { Cadastros } from "@/data/catalogo";
import { comTransacaoPg, databaseUrlConfigurada, queryPg } from "@/lib/db/pool";
import { salvarOperacionalNoPostgres } from "@/lib/db/operacional-pg";

let gravacaoAgendada: ReturnType<typeof setTimeout> | null = null;
let obterEstado: (() => Cadastros) | null = null;

export function catalogoSnapshotPgDisponivel(): boolean {
  return Boolean(databaseUrlConfigurada());
}

export async function carregarCatalogoSnapshotDoPostgres(): Promise<Cadastros | null> {
  if (!catalogoSnapshotPgDisponivel()) return null;
  const res = await queryPg<{ state: Cadastros }>(
    `SELECT state FROM catalogo_snapshot WHERE id = 1`,
  );
  if (!res || res.rowCount === 0) return null;
  const state = res.rows[0]?.state;
  if (!state || typeof state !== "object") return null;
  return state as Cadastros;
}

export async function salvarCatalogoSnapshotNoPostgres(cadastros: Cadastros): Promise<boolean> {
  if (!catalogoSnapshotPgDisponivel()) return false;
  try {
    const ok = await comTransacaoPg(async (client) => {
      await client.query(
        `INSERT INTO catalogo_snapshot (id, state, atualizado_em)
         VALUES (1, $1::jsonb, NOW())
         ON CONFLICT (id) DO UPDATE SET
           state = EXCLUDED.state,
           atualizado_em = NOW()`,
        [JSON.stringify(cadastros)],
      );
      return true;
    });
    // Mantém tabelas normalizadas alinhadas (identidade + importação).
    await salvarOperacionalNoPostgres(cadastros);
    return Boolean(ok);
  } catch (error) {
    console.error("[pg] falha ao gravar catalogo_snapshot:", error);
    return false;
  }
}

/** Agenda gravação durável no PostgreSQL após mutação do catálogo. */
export function agendarPersistenciaCatalogoNoPostgres(obter: () => Cadastros): void {
  if (typeof window !== "undefined") return;
  if (!catalogoSnapshotPgDisponivel()) return;
  obterEstado = obter;
  if (gravacaoAgendada) clearTimeout(gravacaoAgendada);
  gravacaoAgendada = setTimeout(() => {
    gravacaoAgendada = null;
    const estado = obterEstado?.();
    if (!estado) return;
    void salvarCatalogoSnapshotNoPostgres(estado);
  }, 200);
}

export async function flushPersistenciaCatalogoNoPostgres(): Promise<void> {
  if (gravacaoAgendada) {
    clearTimeout(gravacaoAgendada);
    gravacaoAgendada = null;
  }
  const estado = obterEstado?.();
  if (!estado) return;
  await salvarCatalogoSnapshotNoPostgres(estado);
}
