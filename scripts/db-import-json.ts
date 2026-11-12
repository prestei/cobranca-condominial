import { existsSync, readFileSync } from "fs";
import path from "path";
import type { Cadastros } from "@/data/catalogo";
import { gravarCatalogoNoPostgres } from "@/lib/catalogo/persistencia-postgres";

function carregarDotEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  carregarDotEnv();
  process.env.NODE_ENV ??= "development";

  const arquivo = path.join(process.cwd(), ".data", "catalogo-operacional.json");
  if (!existsSync(arquivo)) {
    console.error("Arquivo não encontrado:", arquivo);
    process.exit(1);
  }

  const parsed = JSON.parse(readFileSync(arquivo, "utf8")) as { state?: Cadastros };
  if (!parsed.state) {
    console.error("JSON sem campo state.");
    process.exit(1);
  }

  await gravarCatalogoNoPostgres(parsed.state);
  console.info("Catálogo importado para PostgreSQL.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
