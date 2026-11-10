import type { Cargo } from "@/data/catalogo";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import {
  deleteRole,
  listRoles,
  nextRoleId,
  permissionsForUserId,
  roleIsAssigned,
  upsertRole,
} from "@/lib/db/repositories/identity-repository";
import { temPermissao } from "@/lib/permissions/check";
import { cargoTemAlgumaPermissao, parsePermissoesJson, serializarPermissoes } from "@/lib/permissions/parse";
import type { PermissoesCargo } from "@/lib/permissions/modulos";

export class CargoServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type CargoInput = {
  nome: string;
  descricao: string;
  permissoes: PermissoesCargo;
  ativo?: boolean;
};

export function parseCargoInputFromRecord(record: Record<string, unknown>): CargoInput | null {
  const nome = typeof record.nome === "string" ? record.nome : "";
  const descricao = typeof record.descricao === "string" ? record.descricao : "";
  const permissoes =
    record.permissoes && typeof record.permissoes === "object"
      ? parsePermissoesJson(JSON.stringify(record.permissoes))
      : parsePermissoesJson(typeof record.permissaoJson === "string" ? record.permissaoJson : "{}");
  const ativo = record.ativo === false ? false : true;
  return { nome, descricao, permissoes, ativo };
}

async function assertPermissao(userId: number, acao: "ler" | "criar" | "editar" | "excluir") {
  const perm = await permissionsForUserId(userId);
  if (!temPermissao(perm, "cargos", acao)) {
    throw new CargoServiceError(`Sem permissão para ${acao} cargos.`, 403);
  }
}

function resumoPermissoesCargo(permissaoJson: string): string {
  const permissoes = parsePermissoesJson(permissaoJson);
  const partes = Object.entries(permissoes)
    .map(([modulo, acoes]) => {
      const flags = Object.entries(acoes ?? {})
        .filter(([, ativo]) => ativo)
        .map(([acao]) => acao);
      if (flags.length === 0) return "";
      return `${modulo}: ${flags.join("+")}`;
    })
    .filter(Boolean);
  return partes.length > 0 ? partes.join(" · ") : "sem permissões";
}

async function validarEntrada(input: CargoInput, cargoId?: number): Promise<CargoInput> {
  const nome = input.nome.trim();
  if (!nome) {
    throw new CargoServiceError("Informe o nome do cargo.", 400);
  }

  const cargos = await listRoles();
  const duplicado = cargos.some(
    (item) =>
      item.id !== cargoId && item.nome.localeCompare(nome, "pt-BR", { sensitivity: "base" }) === 0,
  );
  if (duplicado) {
    throw new CargoServiceError("Já existe um cargo com este nome.", 409);
  }

  if (!cargoTemAlgumaPermissao(input.permissoes)) {
    throw new CargoServiceError("Escolha pelo menos uma permissão em alguma área do sistema.", 400);
  }

  return {
    nome,
    descricao: input.descricao.trim(),
    permissoes: input.permissoes,
    ativo: input.ativo,
  };
}

export async function listarCargos(userId: number): Promise<Cargo[]> {
  await assertPermissao(userId, "ler");
  const cargos = await listRoles();
  return [...cargos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function criarCargo(
  actorUserId: number,
  input: CargoInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<Cargo> {
  await assertPermissao(actorUserId, "criar");
  const dados = await validarEntrada(input);
  const id = await nextRoleId();
  const permissaoJson = serializarPermissoes(dados.permissoes);
  const cargo: Cargo = {
    id,
    nome: dados.nome,
    descricao: dados.descricao,
    permissaoJson,
    ativo: dados.ativo !== false,
  };

  const gravado = await upsertRole(cargo);
  await writeAuditLog({
    entity: "role",
    recordId: String(id),
    action: "INSERT",
    previousData: "",
    newData: JSON.stringify({ nome: cargo.nome, permissoes: resumoPermissoesCargo(permissaoJson) }),
    changedFields: "nome, descricao, permissao_json",
    userId: actorUserId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return gravado;
}

export async function atualizarCargo(
  actorUserId: number,
  cargoId: number,
  input: CargoInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<Cargo> {
  await assertPermissao(actorUserId, "editar");
  const cargos = await listRoles();
  const anterior = cargos.find((item) => item.id === cargoId);
  if (!anterior) {
    throw new CargoServiceError("Cargo não encontrado.", 404);
  }

  const dados = await validarEntrada(input, cargoId);
  const permissaoJson = serializarPermissoes(dados.permissoes);
  const atualizado: Cargo = {
    id: cargoId,
    nome: dados.nome,
    descricao: dados.descricao,
    permissaoJson,
    ativo: dados.ativo !== false,
  };

  const gravado = await upsertRole(atualizado);
  await writeAuditLog({
    entity: "role",
    recordId: String(cargoId),
    action: "UPDATE",
    previousData: JSON.stringify({
      nome: anterior.nome,
      permissoes: resumoPermissoesCargo(anterior.permissaoJson),
    }),
    newData: JSON.stringify({
      nome: atualizado.nome,
      permissoes: resumoPermissoesCargo(permissaoJson),
    }),
    changedFields: "nome, descricao, permissao_json",
    userId: actorUserId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return gravado;
}

export async function excluirCargo(
  actorUserId: number,
  cargoId: number,
  meta?: { ip?: string; userAgent?: string },
) {
  await assertPermissao(actorUserId, "excluir");
  const cargos = await listRoles();
  const alvo = cargos.find((item) => item.id === cargoId);
  if (!alvo) {
    throw new CargoServiceError("Cargo não encontrado.", 404);
  }
  if (await roleIsAssigned(cargoId)) {
    throw new CargoServiceError("Existem colaboradores com este cargo.", 409);
  }

  await deleteRole(cargoId);
  await writeAuditLog({
    entity: "role",
    recordId: String(cargoId),
    action: "DELETE",
    previousData: JSON.stringify({
      nome: alvo.nome,
      permissoes: resumoPermissoesCargo(alvo.permissaoJson),
    }),
    newData: "",
    changedFields: "nome, permissao_json",
    userId: actorUserId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
}

export function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}
