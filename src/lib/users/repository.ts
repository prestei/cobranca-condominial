import type { Usuario } from "@/lib/catalog";
import { normalizarCodigoUsuario } from "@/lib/auth/login-code";
import { query } from "@/lib/db/pool";

type UserRow = {
  id: number;
  codigo: string;
  cargo_id: number | null;
  nome: string | null;
  cpf: string | null;
  data_nascimento: string | null;
  telefone: string | null;
  email: string | null;
  senha: string | null;
};

function mapRow(row: UserRow): Usuario {
  return {
    id: row.id,
    codigo: row.codigo,
    cargoId: row.cargo_id ?? 0,
    nome: row.nome ?? "",
    cpf: row.cpf ?? "",
    dataNascimento: row.data_nascimento ?? "",
    telefone: row.telefone ?? "",
    email: row.email ?? "",
    senha: row.senha ?? "",
  };
}

const SELECT_COLS = `
  id, codigo, cargo_id, nome, cpf, data_nascimento, telefone, email, senha
`;

export async function listUsuarios(): Promise<Usuario[]> {
  const result = await query<UserRow>(
    `SELECT ${SELECT_COLS} FROM "user" ORDER BY id ASC`,
  );
  return result.rows.map(mapRow);
}

export async function findUsuarioById(id: number): Promise<Usuario | null> {
  const result = await query<UserRow>(
    `SELECT ${SELECT_COLS} FROM "user" WHERE id = $1`,
    [id],
  );
  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export async function findUsuarioByCodigo(codigo: string): Promise<Usuario | null> {
  const chave = normalizarCodigoUsuario(codigo);
  if (!chave) return null;
  const result = await query<UserRow>(
    `SELECT ${SELECT_COLS} FROM "user" WHERE LOWER(codigo) = LOWER($1) LIMIT 1`,
    [chave],
  );
  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export async function codigoJaExiste(codigo: string, excludeId: number | null): Promise<boolean> {
  const chave = normalizarCodigoUsuario(codigo);
  if (!chave) return false;
  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS(
      SELECT 1 FROM "user"
      WHERE LOWER(codigo) = LOWER($1)
        AND ($2::int IS NULL OR id <> $2)
    ) AS exists`,
    [chave, excludeId],
  );
  return result.rows[0]?.exists ?? false;
}

export async function emailJaExiste(email: string, excludeId: number | null): Promise<boolean> {
  const trimmed = email.trim();
  if (!trimmed) return false;
  const result = await query<{ exists: boolean }>(
    `SELECT EXISTS(
      SELECT 1 FROM "user"
      WHERE LOWER(email) = LOWER($1)
        AND ($2::int IS NULL OR id <> $2)
    ) AS exists`,
    [trimmed, excludeId],
  );
  return result.rows[0]?.exists ?? false;
}

export type UsuarioPersistido = {
  codigo: string;
  cargoId: number;
  nome: string;
  cpf: string;
  dataNascimento: string;
  telefone: string;
  email: string;
  senha: string;
};

export async function insertUsuario(data: UsuarioPersistido): Promise<Usuario> {
  const result = await query<UserRow>(
    `INSERT INTO "user" (codigo, cargo_id, nome, cpf, data_nascimento, telefone, email, senha)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${SELECT_COLS}`,
    [
      data.codigo,
      data.cargoId,
      data.nome,
      data.cpf || null,
      data.dataNascimento || null,
      data.telefone || null,
      data.email,
      data.senha,
    ],
  );
  return mapRow(result.rows[0]);
}

export async function updateUsuario(id: number, data: UsuarioPersistido): Promise<Usuario | null> {
  const result = await query<UserRow>(
    `UPDATE "user"
     SET codigo = $2,
         cargo_id = $3,
         nome = $4,
         cpf = $5,
         data_nascimento = $6,
         telefone = $7,
         email = $8,
         senha = $9
     WHERE id = $1
     RETURNING ${SELECT_COLS}`,
    [
      id,
      data.codigo,
      data.cargoId,
      data.nome,
      data.cpf || null,
      data.dataNascimento || null,
      data.telefone || null,
      data.email,
      data.senha,
    ],
  );
  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export async function deleteUsuarioById(id: number): Promise<boolean> {
  const result = await query(`DELETE FROM "user" WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function countUsuariosPorCargo(cargoId: number): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM "user" WHERE cargo_id = $1`,
    [cargoId],
  );
  return Number(result.rows[0]?.count ?? 0);
}
