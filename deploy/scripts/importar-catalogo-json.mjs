#!/usr/bin/env node
/**
 * Importa JSON legado de catálogo para o PostgreSQL via Prisma.
 * Uso na VPS: node deploy/scripts/importar-catalogo-json.mjs [caminho.json]
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const envFile = path.join(root, "deploy/.env.production");
if (existsSync(envFile)) {
  const envRaw = readFileSync(envFile, "utf8");
  for (const line of envRaw.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

if (!process.env.DATABASE_URL?.trim()) {
  console.error("DATABASE_URL ausente");
  process.exit(1);
}

const jsonPath = path.resolve(
  process.argv[2] || path.join(root, "catalogo-operacional.import.json"),
);
if (!existsSync(jsonPath)) {
  console.error("Arquivo não encontrado:", jsonPath);
  process.exit(1);
}

const persistScript = path.join(root, "scripts/persist-catalog-json.mts");
const run = spawnSync(
  process.execPath,
  ["--import", "tsx", persistScript, jsonPath],
  { cwd: root, stdio: "inherit", env: process.env },
);
process.exit(run.status ?? 1);
