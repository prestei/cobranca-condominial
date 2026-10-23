import { query } from "@/lib/db/pool";
import type { CargoPublico } from "@/lib/roles/types";

type RoleRow = {
  id: number;
  nome: string;
  descricao: string;
  permissao_json: string;
};

function mapRow(row: RoleRow): CargoPublico {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao ?? "",
    permissaoJson: row.permissao_json ?? "{}",
  };
}

export async function listarCargos(): Promise<CargoPublico[]> {
  const result = await query<RoleRow>(`SELECT id, nome, descricao, permissao_json FROM role ORDER BY nome ASC`);
  return result.rows.map(mapRow);
}

export async function buscarCargoPorId(id: number): Promise<CargoPublico | null> {
  const result = await query<RoleRow>(
    `SELECT id, nome, descricao, permissao_json FROM role WHERE id = $1`,
    [id],
  );
  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export async function buscarCargoPorNome(nome: string, excetoId?: number | null): Promise<CargoPublico | null> {
  const result = await query<RoleRow>(
    `SELECT id, nome, descricao, permissao_json FROM role WHERE LOWER(nome) = LOWER($1) AND ($2::int IS NULL OR id <> $2) LIMIT 1`,
    [nome, excetoId ?? null],
  );
  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export async function inserirCargo(nome: string, descricao: string, permissaoJson: string): Promise<CargoPublico> {
  const result = await query<RoleRow>(
    `INSERT INTO role (nome, descricao, permissao_json) VALUES ($1, $2, $3)
     RETURNING id, nome, descricao, permissao_json`,
    [nome, descricao, permissaoJson],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Falha ao inserir cargo.");
  return mapRow(row);
}

export async function atualizarCargo(
  id: number,
  nome: string,
  descricao: string,
  permissaoJson: string,
): Promise<CargoPublico | null> {
  const result = await query<RoleRow>(
    `UPDATE role SET nome = $2, descricao = $3, permissao_json = $4 WHERE id = $1
     RETURNING id, nome, descricao, permissao_json`,
    [id, nome, descricao, permissaoJson],
  );
  const row = result.rows[0];
  return row ? mapRow(row) : null;
}

export async function excluirCargo(id: number): Promise<boolean> {
  const result = await query(`DELETE FROM role WHERE id = $1`, [id]);
  return (result.rowCount ?? 0) > 0;
}

export async function cargoExiste(id: number): Promise<boolean> {
  const result = await query<{ exists: boolean }>(`SELECT EXISTS(SELECT 1 FROM role WHERE id = $1) AS exists`, [id]);
  return result.rows[0]?.exists === true;
}
