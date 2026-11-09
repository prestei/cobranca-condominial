import {
  getCadastros,
  proximoNumero,
  registrarAuditoria,
  setCargos,
  type Cargo,
} from "@/data/catalogo";
import {
  excluirCargoPg,
  identityPgDisponivel,
  listarCargosPg,
  upsertCargoPg,
} from "@/lib/db/identity-pg";
import { temPermissao } from "@/lib/permissions/check";
import { cargoTemAlgumaPermissao, parsePermissoesJson, serializarPermissoes } from "@/lib/permissions/parse";
import type { PermissoesCargo } from "@/lib/permissions/modulos";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

async function persistirCargoNoPostgres(cargo: Cargo) {
  if (!identityPgDisponivel()) {
    if (process.env.NODE_ENV === "production") {
      throw new CargoServiceError("PostgreSQL indisponível para gravar cargo.", 503);
    }
    return;
  }
  const ok = await upsertCargoPg(cargo);
  if (!ok) {
    throw new CargoServiceError("Falha ao gravar cargo no PostgreSQL.", 500);
  }
}

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

function assertPermissao(userId: number, acao: "ler" | "criar" | "editar" | "excluir") {
  const perm = permissoesDoUsuarioId(userId);
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

function validarEntrada(input: CargoInput, cargoId?: number): CargoInput {
  const nome = input.nome.trim();
  if (!nome) {
    throw new CargoServiceError("Informe o nome do cargo.", 400);
  }

  const duplicado = getCadastros().cargos.some(
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
  };
}

export async function listarCargos(userId: number): Promise<Cargo[]> {
  assertPermissao(userId, "ler");
  if (identityPgDisponivel()) {
    const doPg = await listarCargosPg();
    if (doPg) {
      setCargos(doPg);
      return [...doPg].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    }
  }
  return [...getCadastros().cargos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function criarCargo(
  actorUserId: number,
  input: CargoInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<Cargo> {
  assertPermissao(actorUserId, "criar");
  const dados = validarEntrada(input);
  const id = proximoNumero(getCadastros().cargos.map((item) => item.id));
  const permissaoJson = serializarPermissoes(dados.permissoes);
  const cargo: Cargo = {
    id,
    nome: dados.nome,
    descricao: dados.descricao,
    permissaoJson,
    ativo: dados.ativo !== false,
  };

  await persistirCargoNoPostgres(cargo);
  setCargos((current) => [...current, cargo]);
  registrarAuditoria(
    {
      entidade: "role",
      registroId: String(id),
      acao: "INSERT",
      dadosAnteriores: "",
      dadosNovos: JSON.stringify({ nome: cargo.nome, permissoes: resumoPermissoesCargo(permissaoJson) }),
      camposAlterados: "nome, descricao, permissao_json",
    },
    actorUserId,
    meta,
  );
  return cargo;
}

export async function atualizarCargo(
  actorUserId: number,
  cargoId: number,
  input: CargoInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<Cargo> {
  assertPermissao(actorUserId, "editar");
  const anterior = getCadastros().cargos.find((item) => item.id === cargoId);
  if (!anterior) {
    throw new CargoServiceError("Cargo não encontrado.", 404);
  }

  const dados = validarEntrada(input, cargoId);
  const permissaoJson = serializarPermissoes(dados.permissoes);
  const atualizado: Cargo = {
    id: cargoId,
    nome: dados.nome,
    descricao: dados.descricao,
    permissaoJson,
    ativo: dados.ativo !== false,
  };

  await persistirCargoNoPostgres(atualizado);
  setCargos((current) => current.map((item) => (item.id === cargoId ? atualizado : item)));
  registrarAuditoria(
    {
      entidade: "role",
      registroId: String(cargoId),
      acao: "UPDATE",
      dadosAnteriores: JSON.stringify({
        nome: anterior.nome,
        permissoes: resumoPermissoesCargo(anterior.permissaoJson),
      }),
      dadosNovos: JSON.stringify({
        nome: atualizado.nome,
        permissoes: resumoPermissoesCargo(permissaoJson),
      }),
      camposAlterados: "nome, descricao, permissao_json",
    },
    actorUserId,
    meta,
  );
  return atualizado;
}

export async function excluirCargo(
  actorUserId: number,
  cargoId: number,
  meta?: { ip?: string; userAgent?: string },
) {
  assertPermissao(actorUserId, "excluir");
  const alvo = getCadastros().cargos.find((item) => item.id === cargoId);
  if (!alvo) {
    throw new CargoServiceError("Cargo não encontrado.", 404);
  }
  if (getCadastros().usuarios.some((item) => item.cargoId === cargoId)) {
    throw new CargoServiceError("Existem colaboradores com este cargo.", 409);
  }

  if (identityPgDisponivel()) {
    const ok = await excluirCargoPg(cargoId);
    if (!ok) {
      throw new CargoServiceError("Falha ao excluir cargo no PostgreSQL.", 500);
    }
  } else if (process.env.NODE_ENV === "production") {
    throw new CargoServiceError("PostgreSQL indisponível para excluir cargo.", 503);
  }

  setCargos((current) => current.filter((item) => item.id !== cargoId));
  registrarAuditoria(
    {
      entidade: "role",
      registroId: String(cargoId),
      acao: "DELETE",
      dadosAnteriores: JSON.stringify({
        nome: alvo.nome,
        permissoes: resumoPermissoesCargo(alvo.permissaoJson),
      }),
      dadosNovos: "",
      camposAlterados: "nome, permissao_json",
    },
    actorUserId,
    meta,
  );
}

export function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}
