#!/usr/bin/env node
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function carregarDatabaseUrl() {
  const envPath = path.join(root, ".env");
  try {
    const raw = readFileSync(envPath, "utf8");
    const linha = raw.split(/\r?\n/).find((item) => item.startsWith("DATABASE_URL="));
    if (linha) return linha.slice("DATABASE_URL=".length).trim();
  } catch {
    // ignore
  }
  return process.env.DATABASE_URL?.trim() || "";
}

const databaseUrl = carregarDatabaseUrl();
if (!databaseUrl) {
  console.error("DATABASE_URL não configurada.");
  process.exit(1);
}

const migrationsDir = path.join(root, "docs/migrations");
const sqlFiles = readdirSync(migrationsDir)
  .filter((name) => name.endsWith(".sql"))
  .sort();

if (sqlFiles.length === 0) {
  console.error("Nenhuma migration .sql em docs/migrations.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  for (const file of sqlFiles) {
    const sqlPath = path.join(migrationsDir, file);
    const sql = readFileSync(sqlPath, "utf8");
    await client.query(sql);
    console.log("Migration aplicada:", path.relative(root, sqlPath));
  }
} finally {
  await client.end();
}
