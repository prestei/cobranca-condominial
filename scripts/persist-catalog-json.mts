/**
 * Importa um JSON de catálogo legado para o PostgreSQL via Prisma.
 * Uso: node --import tsx scripts/persist-catalog-json.mts [caminho.json]
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Cadastros } from "../src/data/catalogo.ts";
import { prisma } from "../src/lib/db/prisma.ts";
import { saveCatalogBulkToPostgres } from "../src/lib/db/repositories/catalog-bulk-persist.ts";
import { upsertRole, upsertUser } from "../src/lib/db/repositories/identity-repository.ts";

const jsonPath = path.resolve(process.argv[2] || "catalogo-operacional.import.json");
const raw = JSON.parse(readFileSync(jsonPath, "utf8"));
const state = (raw.state ?? raw) as Cadastros;

if (!state?.cargos || !state?.usuarios) {
  console.error("JSON sem cargos/usuarios");
  process.exit(1);
}

try {
  for (const cargo of state.cargos) {
    await upsertRole(cargo);
  }
  for (const usuario of state.usuarios) {
    await upsertUser(usuario);
  }

  const ok = await saveCatalogBulkToPostgres(state);
  if (!ok) {
    console.error("Falha ao gravar catálogo nas tabelas.");
    process.exit(1);
  }

  console.log("Import OK", {
    cargos: state.cargos.length,
    usuarios: state.usuarios.length,
    condominios: state.condominios?.length ?? 0,
    unidades: state.unidades?.length ?? 0,
    debitos: state.debitos?.length ?? 0,
  });
} finally {
  await prisma.$disconnect();
}
