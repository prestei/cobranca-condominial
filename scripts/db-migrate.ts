import { existsSync, readFileSync } from "fs";
import { readdir, readFile as readFileAsync } from "fs/promises";
import path from "path";
import { Client } from "pg";

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
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("Defina DATABASE_URL no .env antes de rodar db:migrate.");
    process.exit(1);
  }

  const roots = [
    path.join(process.cwd(), "migrations"),
    path.join(process.cwd(), "docs", "migrations"),
  ];
  const arquivos: string[] = [];
  for (const dir of roots) {
    if (!existsSync(dir)) continue;
    const nomes = (await readdir(dir))
      .filter((nome) => nome.endsWith(".sql"))
      .sort()
      .map((nome) => path.join(dir, nome));
    arquivos.push(...nomes);
  }
  arquivos.sort();

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  try {
    for (const arquivo of arquivos) {
      const sql = await readFileAsync(arquivo, "utf8");
      console.info(`Aplicando ${path.relative(process.cwd(), arquivo)}...`);
      await client.query(sql);
      console.info(`OK: ${arquivo}`);
    }
    console.info("Migrations concluídas.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
