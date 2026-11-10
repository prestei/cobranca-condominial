import { Cadastros } from "@/data/catalogo";
import { salvarCatalogoNoPostgres } from "@/lib/db/repositories/catalog-bulk-persist";

/**
 * Grava o estado operacional nas tabelas normalizadas (importação e fluxos transacionais).
 */
export async function saveOperationalState(cadastros: Cadastros): Promise<boolean> {
  return salvarCatalogoNoPostgres(cadastros);
}
