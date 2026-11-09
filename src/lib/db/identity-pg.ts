import type { Cargo, Usuario } from "@/data/catalogo";
import { databaseUrlConfigurada, queryPg, comTransacaoPg } from "@/lib/db/pool";
import { normalizarCodigoUsuario } from "@/lib/auth/codigo";
import {
  PERMISSAO_JSON_ADMIN,
  PERMISSAO_JSON_ADVOGADO,
  PERMISSAO_JSON_ATENDENTE,
} from "@/lib/permissions/seeds";
import { parsePermissoesJson, permissoesVazias } from "@/lib/permissions/parse";
import type { PermissoesCargo } from "@/lib/permissions/modulos";
import type { PoolClient } from "pg";

/** bcrypt de `prestei2026*` — admin de produção. */
const SENHA_PRESTEI_HASH = "$2b$12$/UhciRXh66gjGveqckiPl.aqXSXcC/2hwJNaAGwvHDEgX0SPt7Vvq";

const CARGOS_PADRAO: Cargo[] = [
  {
    id: 1,
    nome: "Administrador",
    descricao: "Cadastros, relatórios, exportações e correção de registros.",
    permissaoJson: PERMISSAO_JSON_ADMIN,
    ativo: true,
  },
  {
    id: 2,
    nome: "Atendente",
    descricao: "Registra atendimentos e acompanha os próprios retornos.",
    permissaoJson: PERMISSAO_JSON_ATENDENTE,
    ativo: true,
  },
  {
    id: 3,
    nome: "Advogado",
    descricao: "Consulta relatórios e o histórico dos condomínios sob sua responsabilidade.",
    permissaoJson: PERMISSAO_JSON_ADVOGADO,
    ativo: true,
  },
];

const USUARIO_PRESTEI: Usuario = {
  id: 1,
  codigo: "PRESTEI",
  codigoRe: "RE-10000",
  cargoId: 1,
  nome: "Prestei",
  telefone: "",
  email: "prestei@danieljorgeadv.com",
  senha: SENHA_PRESTEI_HASH,
  ativo: true,
};

function mapCargo(row: Record<string, unknown>): Cargo {
  return {
    id: Number(row.id),
    nome: String(row.nome ?? ""),
    descricao: String(row.descricao ?? ""),
    permissaoJson: String(row.permissao_json ?? "{}"),
    ativo: row.ativo === false ? false : true,
  };
}

function mapUsuario(row: Record<string, unknown>): Usuario {
  return {
    id: Number(row.id),
    codigo: String(row.codigo ?? ""),
    ...(row.codigo_re ? { codigoRe: String(row.codigo_re) } : {}),
    cargoId: Number(row.cargo_id),
    nome: String(row.nome ?? ""),
    telefone: String(row.telefone ?? ""),
    email: String(row.email ?? ""),
    senha: String(row.senha ?? ""),
    ativo: row.ativo === false ? false : true,
  };
}

export function identityPgDisponivel(): boolean {
  return Boolean(databaseUrlConfigurada());
}

export async function listarCargosPg(): Promise<Cargo[] | null> {
  if (!identityPgDisponivel()) return null;
  const res = await queryPg(`SELECT id, nome, descricao, permissao_json, COALESCE(ativo, true) AS ativo FROM role ORDER BY id`);
  if (!res) return null;
  return res.rows.map((row) => mapCargo(row as Record<string, unknown>));
}

export async function listarUsuariosPg(): Promise<Usuario[] | null> {
  if (!identityPgDisponivel()) return null;
  const res = await queryPg(
    `SELECT id, codigo, codigo_re, cargo_id, nome, telefone, email, senha, COALESCE(ativo, true) AS ativo
     FROM "user" ORDER BY id`,
  );
  if (!res) return null;
  return res.rows.map((row) => mapUsuario(row as Record<string, unknown>));
}

export async function buscarUsuarioPorIdPg(id: number): Promise<Usuario | null> {
  if (!identityPgDisponivel()) return null;
  const res = await queryPg(
    `SELECT id, codigo, codigo_re, cargo_id, nome, telefone, email, senha, COALESCE(ativo, true) AS ativo
     FROM "user" WHERE id = $1`,
    [id],
  );
  if (!res || res.rowCount === 0) return null;
  return mapUsuario(res.rows[0] as Record<string, unknown>);
}

export async function buscarUsuarioPorCodigoLoginPg(codigo: string): Promise<Usuario | null> {
  if (!identityPgDisponivel()) return null;
  const chave = normalizarCodigoUsuario(codigo);
  if (!chave) return null;

  const res = await queryPg(
    `SELECT id, codigo, codigo_re, cargo_id, nome, telefone, email, senha, COALESCE(ativo, true) AS ativo
     FROM "user"
     WHERE COALESCE(ativo, true) = true
       AND (
         lower(trim(codigo)) = lower($1)
         OR (codigo_re IS NOT NULL AND trim(codigo_re) <> '' AND lower(trim(codigo_re)) = lower($1))
       )
     LIMIT 1`,
    [chave],
  );
  if (!res || res.rowCount === 0) return null;
  return mapUsuario(res.rows[0] as Record<string, unknown>);
}

export async function permissoesDoUsuarioIdPg(userId: number): Promise<PermissoesCargo | null> {
  if (!identityPgDisponivel()) return null;
  const res = await queryPg(
    `SELECT r.permissao_json
     FROM "user" u
     INNER JOIN role r ON r.id = u.cargo_id
     WHERE u.id = $1`,
    [userId],
  );
  if (!res) return null;
  if (res.rowCount === 0) return permissoesVazias();
  return parsePermissoesJson(String(res.rows[0]?.permissao_json ?? "{}"));
}

async function ajustarSequencia(client: PoolClient, tabela: "role" | "user") {
  const tabelaSql = tabela === "user" ? `"user"` : tabela;
  await client.query(
    `SELECT setval(
       pg_get_serial_sequence($1, 'id'),
       GREATEST(COALESCE((SELECT MAX(id) FROM ${tabelaSql}), 1), 1),
       true
     )`,
    [tabela],
  );
}

export async function upsertCargoPg(cargo: Cargo): Promise<boolean> {
  if (!identityPgDisponivel()) return false;
  const ok = await comTransacaoPg(async (client) => {
    await client.query(
      `INSERT INTO role (id, nome, descricao, permissao_json, ativo)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET
         nome = EXCLUDED.nome,
         descricao = EXCLUDED.descricao,
         permissao_json = EXCLUDED.permissao_json,
         ativo = EXCLUDED.ativo`,
      [cargo.id, cargo.nome, cargo.descricao ?? "", cargo.permissaoJson ?? "{}", cargo.ativo !== false],
    );
    await ajustarSequencia(client, "role");
    return true;
  });
  return Boolean(ok);
}

export async function excluirCargoPg(cargoId: number): Promise<boolean> {
  if (!identityPgDisponivel()) return false;
  const res = await queryPg(`DELETE FROM role WHERE id = $1`, [cargoId]);
  return Boolean(res);
}

export async function upsertUsuarioPg(usuario: Usuario): Promise<boolean> {
  if (!identityPgDisponivel()) return false;
  const ok = await comTransacaoPg(async (client) => {
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
    await ajustarSequencia(client, "user");
    return true;
  });
  return Boolean(ok);
}

export async function excluirUsuarioPg(usuarioId: number): Promise<boolean> {
  if (!identityPgDisponivel()) return false;
  const res = await queryPg(`DELETE FROM "user" WHERE id = $1`, [usuarioId]);
  return Boolean(res);
}

/** Garante cargos padrão e admin Prestei quando o banco de identidade está vazio. */
export async function garantirIdentidadeInicialPg(): Promise<{ cargos: Cargo[]; usuarios: Usuario[] } | null> {
  if (!identityPgDisponivel()) return null;

  let cargos = (await listarCargosPg()) ?? [];
  if (cargos.length === 0) {
    for (const cargo of CARGOS_PADRAO) {
      await upsertCargoPg(cargo);
    }
    cargos = (await listarCargosPg()) ?? [];
    console.info("[pg] Cargos padrão gravados no PostgreSQL.");
  }

  let usuarios = (await listarUsuariosPg()) ?? [];
  if (usuarios.length === 0) {
    await upsertUsuarioPg(USUARIO_PRESTEI);
    usuarios = (await listarUsuariosPg()) ?? [];
    console.info("[pg] Usuário administrador Prestei gravado no PostgreSQL.");
  }

  return { cargos, usuarios };
}

export async function carregarIdentidadeDoPostgres(): Promise<{ cargos: Cargo[]; usuarios: Usuario[] } | null> {
  const garantido = await garantirIdentidadeInicialPg();
  return garantido;
}
