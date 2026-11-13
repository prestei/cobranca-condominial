import { Cargo, Usuario } from "@/data/catalogo";
import { prisma } from "@/lib/db/prisma";
import { mapRoleToCargo, mapUserToUsuario } from "@/lib/db/mappers";
import { entradaLoginCoincideCodigo } from "@/lib/auth/codigo";
import {
  PERMISSAO_JSON_ADMIN,
  PERMISSAO_JSON_ADVOGADO,
  PERMISSAO_JSON_ATENDENTE,
  permissoesPadraoPorNome,
} from "@/lib/permissions/seeds";
import {
  cargoTemAlgumaPermissao,
  parsePermissoesJson,
  permissoesVazias,
  serializarPermissoes,
  unirPermissoesCargo,
} from "@/lib/permissions/parse";
import type { PermissoesCargo } from "@/lib/permissions/modulos";

const SENHA_PRESTEI_HASH = "$2b$12$/UhciRXh66gjGveqckiPl.aqXSXcC/2hwJNaAGwvHDEgX0SPt7Vvq";

const DEFAULT_ROLES: Cargo[] = [
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

const DEFAULT_ADMIN: Usuario = {
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

export async function listRoles(): Promise<Cargo[]> {
  const rows = await prisma.role.findMany({ orderBy: { id: "asc" } });
  return rows.map(mapRoleToCargo);
}

export async function listUsers(): Promise<Usuario[]> {
  const rows = await prisma.user.findMany({ orderBy: { id: "asc" } });
  return rows.map(mapUserToUsuario);
}

export async function findUserById(id: number): Promise<Usuario | null> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? mapUserToUsuario(row) : null;
}

export async function findUserByLoginCode(codigo: string): Promise<Usuario | null> {
  if (!codigo.trim()) return null;
  const rows = await prisma.user.findMany({
    where: { active: true },
    orderBy: { id: "asc" },
  });
  const found = rows.find((row) => entradaLoginCoincideCodigo(codigo, row.code, row.reCode));
  return found ? mapUserToUsuario(found) : null;
}

export async function permissionsForUserId(userId: number): Promise<PermissoesCargo> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    include: { role: true },
  });
  if (!row?.role) return permissoesVazias();
  return parsePermissoesJson(row.role.permissionJson ?? "{}");
}

export async function upsertRole(cargo: Cargo): Promise<Cargo> {
  const row = await prisma.role.upsert({
    where: { id: cargo.id },
    create: {
      id: cargo.id,
      name: cargo.nome,
      description: cargo.descricao ?? "",
      permissionJson: cargo.permissaoJson ?? "{}",
      active: cargo.ativo !== false,
    },
    update: {
      name: cargo.nome,
      description: cargo.descricao ?? "",
      permissionJson: cargo.permissaoJson ?? "{}",
      active: cargo.ativo !== false,
    },
  });
  return mapRoleToCargo(row);
}

export async function deleteRole(roleId: number): Promise<void> {
  await prisma.role.delete({ where: { id: roleId } });
}

export async function upsertUser(usuario: Usuario): Promise<Usuario> {
  const row = await prisma.user.upsert({
    where: { id: usuario.id },
    create: {
      id: usuario.id,
      code: usuario.codigo,
      reCode: usuario.codigoRe?.trim() || null,
      roleId: usuario.cargoId,
      name: usuario.nome,
      phone: usuario.telefone?.trim() || null,
      email: usuario.email?.trim() || null,
      password: usuario.senha || null,
      avatar: usuario.avatar?.trim() || null,
      active: usuario.ativo !== false,
    },
    update: {
      code: usuario.codigo,
      reCode: usuario.codigoRe?.trim() || null,
      roleId: usuario.cargoId,
      name: usuario.nome,
      phone: usuario.telefone?.trim() || null,
      email: usuario.email?.trim() || null,
      ...(usuario.senha ? { password: usuario.senha } : {}),
      avatar: usuario.avatar?.trim() || null,
      active: usuario.ativo !== false,
    },
  });
  return mapUserToUsuario(row);
}

export async function deleteUser(userId: number): Promise<void> {
  await prisma.user.delete({ where: { id: userId } });
}

export async function nextUserId(): Promise<number> {
  const agg = await prisma.user.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0) + 1;
}

export async function nextRoleId(): Promise<number> {
  const agg = await prisma.role.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0) + 1;
}

export async function ensureIdentitySeed(): Promise<{ cargos: Cargo[]; usuarios: Usuario[] }> {
  let cargos = await listRoles();
  if (cargos.length === 0) {
    for (const cargo of DEFAULT_ROLES) {
      await upsertRole(cargo);
    }
    cargos = await listRoles();
  } else {
    for (const cargo of cargos) {
      const padrao = permissoesPadraoPorNome(cargo.nome);
      if (!padrao) continue;
      const atual = parsePermissoesJson(cargo.permissaoJson);
      if (!cargoTemAlgumaPermissao(atual)) {
        await upsertRole({ ...cargo, permissaoJson: serializarPermissoes(padrao) });
        continue;
      }
      const mesclado = unirPermissoesCargo(atual, padrao);
      const proximoJson = serializarPermissoes(mesclado);
      if (proximoJson !== (cargo.permissaoJson ?? "{}")) {
        await upsertRole({ ...cargo, permissaoJson: proximoJson });
      }
    }
    cargos = await listRoles();
  }

  let usuarios = await listUsers();
  if (usuarios.length === 0) {
    await upsertUser(DEFAULT_ADMIN);
    usuarios = await listUsers();
  }

  return { cargos, usuarios };
}

export async function userIsReferenced(userId: number): Promise<boolean> {
  const [tickets, imports, audits] = await Promise.all([
    prisma.serviceTicket.count({ where: { userId } }),
    prisma.import.count({ where: { userId } }),
    prisma.auditLog.count({ where: { userId } }),
  ]);
  return tickets + imports + audits > 0;
}

export async function roleIsAssigned(roleId: number): Promise<boolean> {
  const count = await prisma.user.count({ where: { roleId } });
  return count > 0;
}
