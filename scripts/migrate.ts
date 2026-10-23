import "./load-env";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString?.trim()) {
    console.error("Defina DATABASE_URL no arquivo .env (veja .env.example).");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  const migrationsDir = join(process.cwd(), "db", "migrations");
  const files = readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`Aplicando ${file}...`);
    await client.query(sql);
  }

  await client.end();
  console.log("Migrations concluídas. Execute npm run db:seed para dados iniciais.");
}

main().catch((error: unknown) => {
  const pgError = error as { code?: string };
  if (pgError.code === "28P01") {
    console.error(
      "Falha de autenticação no PostgreSQL (senha ou usuário incorretos em DATABASE_URL).\n" +
        "Se você usa o Postgres do Windows na porta 5432, coloque a senha real no .env.\n" +
        "Ou suba o banco do projeto: npm run db:up (Docker na porta 5433) e use a URL do .env.example.",
    );
  } else {
    console.error(error);
  }
  process.exit(1);
});
