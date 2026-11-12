import type { Cadastros } from "@/data/catalogo";
import {
  agendarPersistenciaCatalogo as agendarPersistenciaDisco,
  hidratarCatalogoDoArquivo,
} from "@/lib/catalogo/persistencia-disco";
import { carregarCatalogoDoPostgres, gravarCatalogoNoPostgres } from "@/lib/catalogo/persistencia-postgres";
import { postgresDisponivel } from "@/lib/db/client";

/** Ordem: PostgreSQL (se houver snapshot) → arquivo JSON. */
export async function hidratarCatalogoPersistido(substituir: (state: Cadastros) => void): Promise<void> {
  if (postgresDisponivel()) {
    try {
      const doBanco = await carregarCatalogoDoPostgres();
      if (doBanco) {
        substituir(doBanco);
        console.info("[catalogo] Estado restaurado do PostgreSQL (catalog_snapshot).");
        return;
      }
    } catch (error) {
      console.error("[catalogo] Falha ao carregar do PostgreSQL; tentando arquivo local:", error);
    }
  }

  const doArquivo = await hidratarCatalogoDoArquivo();
  if (doArquivo) {
    substituir(doArquivo);
    if (postgresDisponivel()) {
      try {
        await gravarCatalogoNoPostgres(doArquivo);
        console.info("[catalogo] Snapshot importado do JSON para o PostgreSQL.");
      } catch (error) {
        console.error("[catalogo] Não foi possível importar o JSON para o PostgreSQL:", error);
      }
    }
  }
}

export function agendarPersistenciaCatalogo(obterEstado: () => Cadastros, pular: () => boolean): void {
  agendarPersistenciaDisco(obterEstado, pular, async (state) => {
    if (!postgresDisponivel()) return;
    try {
      await gravarCatalogoNoPostgres(state);
    } catch (error) {
      console.error("[catalogo] Falha ao gravar catálogo no PostgreSQL:", error);
    }
  });
}
