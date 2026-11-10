#!/usr/bin/env node
/**
 * Importa catalogo-operacional.json (legado .data) para role/"user"/catalogo_snapshot.
 * Uso na VPS: node deploy/scripts/importar-catalogo-json.mjs [caminho.json]
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const envFile = path.join(root, "deploy/.env.production");
const envRaw = readFileSync(envFile, "utf8");
for (const line of envRaw.split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  console.error("DATABASE_URL ausente");
  process.exit(1);
}

const jsonPath = path.resolve(
  process.argv[2] || path.join(root, "catalogo-operacional.import.json"),
);
const raw = JSON.parse(readFileSync(jsonPath, "utf8"));
const state = raw.state ?? raw;
if (!state?.cargos || !state?.usuarios) {
  console.error("JSON sem state.cargos/usuarios");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });
await client.connect();
try {
  await client.query("BEGIN");

  for (const cargo of state.cargos) {
    await client.query(
      `INSERT INTO role (id, nome, descricao, permissao_json, ativo)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         nome = EXCLUDED.nome,
         descricao = EXCLUDED.descricao,
         permissao_json = EXCLUDED.permissao_json,
         ativo = EXCLUDED.ativo`,
      [
        cargo.id,
        cargo.nome,
        cargo.descricao ?? "",
        cargo.permissaoJson ?? "{}",
        cargo.ativo !== false,
      ],
    );
  }

  for (const usuario of state.usuarios) {
    await client.query(
      `INSERT INTO "user" (id, codigo, codigo_re, cargo_id, nome, telefone, email, senha, ativo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         codigo = EXCLUDED.codigo,
         codigo_re = EXCLUDED.codigo_re,
         cargo_id = EXCLUDED.cargo_id,
         nome = EXCLUDED.nome,
         telefone = EXCLUDED.telefone,
         email = EXCLUDED.email,
         senha = COALESCE(EXCLUDED.senha, "user".senha),
         ativo = EXCLUDED.ativo`,
      [
        usuario.id,
        usuario.codigo,
        usuario.codigoRe?.trim() || null,
        usuario.cargoId,
        usuario.nome,
        usuario.telefone?.trim() || null,
        usuario.email?.trim() || null,
        usuario.senha || null,
        usuario.ativo !== false,
      ],
    );
  }

  await client.query(
    `INSERT INTO catalogo_snapshot (id, state, atualizado_em)
     VALUES (1, $1::jsonb, NOW())
     ON CONFLICT (id) DO UPDATE SET state = EXCLUDED.state, atualizado_em = NOW()`,
    [JSON.stringify(state)],
  );

  await client.query(`SELECT setval(pg_get_serial_sequence('role', 'id'), GREATEST((SELECT MAX(id) FROM role), 1), true)`);
  await client.query(
    `SELECT setval(pg_get_serial_sequence('"user"', 'id'), GREATEST((SELECT MAX(id) FROM "user"), 1), true)`,
  );

  await client.query("COMMIT");
  console.log("Import OK", {
    cargos: state.cargos.length,
    usuarios: state.usuarios.length,
    condominios: state.condominios?.length ?? 0,
  });
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
