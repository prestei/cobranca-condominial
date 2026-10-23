import "./load-env";
import pg from "pg";
import bcrypt from "bcryptjs";
import {
  PERMISSAO_JSON_ADMIN,
  PERMISSAO_JSON_ADVOGADO,
  PERMISSAO_JSON_ATENDENTE,
} from "../src/lib/permissions/seeds";

const SENHA_PRESTEI = "1234";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString?.trim()) {
    console.error("Defina DATABASE_URL no arquivo .env (veja .env.example).");
    process.exit(1);
  }

  const client = new pg.Client({ connectionString });
  await client.connect();

  console.log("Inserindo cargos padrão...");
  await client.query(
    `
    INSERT INTO role (id, nome, descricao, permissao_json) VALUES
      (1, 'Administrador', 'Cadastros, relatórios, exportações e correção de registros.', $1),
      (2, 'Atendente', 'Registra atendimentos e acompanha os próprios retornos.', $2),
      (3, 'Advogado', 'Consulta relatórios e o histórico dos condomínios sob sua responsabilidade.', $3)
    ON CONFLICT (id) DO UPDATE SET
      nome = EXCLUDED.nome,
      descricao = EXCLUDED.descricao,
      permissao_json = EXCLUDED.permissao_json
    `,
    [PERMISSAO_JSON_ADMIN, PERMISSAO_JSON_ATENDENTE, PERMISSAO_JSON_ADVOGADO],
  );

  await client.query(
    `SELECT setval(pg_get_serial_sequence('role', 'id'), (SELECT COALESCE(MAX(id), 1) FROM role))`,
  );

  const senhaHash = bcrypt.hashSync(SENHA_PRESTEI, 12);

  console.log("Inserindo colaborador inicial Prestei (código 1234)...");
  await client.query(
    `
    INSERT INTO "user" (id, codigo, cargo_id, nome, cpf, data_nascimento, telefone, email, senha)
    VALUES (1, '1234', 1, 'Prestei', NULL, NULL, NULL, 'prestei@escritorio.example', $1)
    ON CONFLICT (id) DO UPDATE SET
      codigo = EXCLUDED.codigo,
      cargo_id = EXCLUDED.cargo_id,
      nome = EXCLUDED.nome,
      cpf = EXCLUDED.cpf,
      data_nascimento = EXCLUDED.data_nascimento,
      telefone = EXCLUDED.telefone,
      email = EXCLUDED.email,
      senha = EXCLUDED.senha
    `,
    [senhaHash],
  );

  await client.query(
    `SELECT setval(pg_get_serial_sequence('"user"', 'id'), (SELECT COALESCE(MAX(id), 1) FROM "user"))`,
  );

  await client.end();
  console.log("Seed concluído: 3 cargos + usuário Prestei (login 1234 / senha 1234).");
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
