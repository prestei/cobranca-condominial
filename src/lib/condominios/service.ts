import {
  escopoCondominios,
  opcoesAdvogadosResponsaveis,
  statusCondominio,
  type Condominio,
  type StatusCondominio,
} from "@/data/catalogo";
import { loadCadastrosForScope } from "@/lib/db/cadastros-scope";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import {
  condominiumExternalIdExists,
  condominiumHasOperationalHistory,
  createCondominium,
  deleteCondominium,
  findCondominiumById,
  listCondominiums,
  nextCondominiumId,
  updateCondominium,
} from "@/lib/db/repositories/condominium-repository";

export type CondominioInput = Omit<Condominio, "id"> & { id?: number };

export class CondominioServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function condominioNoEscopo(userId: number, condominioId: number) {
  const cadastros = await loadCadastrosForScope();
  const ids = new Set(escopoCondominios(cadastros, userId).map((item) => item.id));
  if (!ids.has(condominioId)) {
    throw new CondominioServiceError("Condomínio fora do seu escopo de acesso.", 403);
  }
}

async function validarAdvogados(nomes: string[]) {
  const cadastros = await loadCadastrosForScope();
  const permitidos = new Set(opcoesAdvogadosResponsaveis(cadastros));
  if (nomes.length === 0) {
    throw new CondominioServiceError("Selecione ao menos um advogado responsável.", 400);
  }
  for (const nome of nomes) {
    if (!permitidos.has(nome)) {
      throw new CondominioServiceError("Advogado responsável inválido.", 400);
    }
  }
}

async function validarEntrada(input: CondominioInput, editingId: number | null): Promise<Omit<Condominio, "id">> {
  const nome = input.nome.trim();
  if (!nome) {
    throw new CondominioServiceError("Informe o nome do condomínio.", 400);
  }
  await validarAdvogados(input.advogados);

  const identificadorExterno = input.identificadorExterno.trim();
  if (identificadorExterno) {
    const duplicado = await condominiumExternalIdExists(identificadorExterno, editingId);
    if (duplicado) {
      throw new CondominioServiceError("Já existe um condomínio com este identificador.", 409);
    }
  }

  const status = input.status;
  if (!statusCondominio.includes(status as StatusCondominio)) {
    throw new CondominioServiceError("Situação do condomínio inválida.", 400);
  }

  return {
    nome,
    identificadorExterno,
    status,
    advogados: [...input.advogados],
    administradora: input.administradora.trim(),
    cep: input.cep.trim(),
    logradouro: input.logradouro.trim(),
    numero: input.numero.trim(),
    complemento: input.complemento.trim(),
    cidade: input.cidade.trim(),
    estado: input.estado.trim(),
    observacao: input.observacao.trim(),
  };
}

export async function listarCondominios(userId: number): Promise<Condominio[]> {
  const cadastros = await loadCadastrosForScope();
  return escopoCondominios(cadastros, userId);
}

export async function criarCondominio(
  userId: number,
  input: CondominioInput,
  meta?: { ip?: string; userAgent?: string },
) {
  const dados = await validarEntrada(input, null);
  let nextId = input.id;
  if (nextId !== undefined) {
    if (!Number.isFinite(nextId) || nextId <= 0) {
      throw new CondominioServiceError("Identificador do condomínio inválido.", 400);
    }
    const existe = await findCondominiumById(nextId);
    if (existe) {
      throw new CondominioServiceError("Já existe um condomínio com este identificador interno.", 409);
    }
  } else {
    nextId = await nextCondominiumId();
  }

  const condominio: Condominio = { id: nextId, ...dados };
  const criado = await createCondominium(condominio);
  await writeAuditLog({
    entity: "condominium",
    recordId: String(nextId),
    action: "INSERT",
    previousData: "",
    newData: criado.nome,
    changedFields: "nome, identificador_externo, advogados, endereco",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return criado;
}

export async function atualizarCondominio(
  userId: number,
  condominioId: number,
  input: CondominioInput,
  meta?: { ip?: string; userAgent?: string },
) {
  const atual = await findCondominiumById(condominioId);
  if (!atual) {
    throw new CondominioServiceError("Condomínio não encontrado.", 404);
  }
  await condominioNoEscopo(userId, condominioId);
  const dados = await validarEntrada(input, condominioId);
  const atualizado: Condominio = { id: condominioId, ...dados };
  const salvo = await updateCondominium(atualizado);
  await writeAuditLog({
    entity: "condominium",
    recordId: String(condominioId),
    action: "UPDATE",
    previousData: atual.nome,
    newData: salvo.nome,
    changedFields: "nome, identificador_externo, advogados, endereco, status",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return salvo;
}

export async function alterarStatusCondominio(
  userId: number,
  condominioId: number,
  status: StatusCondominio,
  meta?: { ip?: string; userAgent?: string },
) {
  const atual = await findCondominiumById(condominioId);
  if (!atual) {
    throw new CondominioServiceError("Condomínio não encontrado.", 404);
  }
  await condominioNoEscopo(userId, condominioId);
  if (!statusCondominio.includes(status)) {
    throw new CondominioServiceError("Situação do condomínio inválida.", 400);
  }
  if (atual.status === status) return atual;

  const atualizado = { ...atual, status };
  const salvo = await updateCondominium(atualizado);
  await writeAuditLog({
    entity: "condominium",
    recordId: String(condominioId),
    action: "UPDATE",
    previousData: JSON.stringify({ status: atual.status }),
    newData: JSON.stringify({ status }),
    changedFields: "status",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return salvo;
}

export async function excluirCondominio(
  userId: number,
  condominioId: number,
  meta?: { ip?: string; userAgent?: string },
) {
  const atual = await findCondominiumById(condominioId);
  if (!atual) {
    throw new CondominioServiceError("Condomínio não encontrado.", 404);
  }
  await condominioNoEscopo(userId, condominioId);

  if (await condominiumHasOperationalHistory(condominioId)) {
    throw new CondominioServiceError(
      "Condomínio com unidades ou histórico de cobrança. Inative o condomínio em vez de excluir.",
      409,
    );
  }

  await deleteCondominium(condominioId);
  await writeAuditLog({
    entity: "condominium",
    recordId: String(condominioId),
    action: "DELETE",
    previousData: JSON.stringify(atual),
    newData: "",
    changedFields: "nome",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
}

/** Listagem interna sem filtro de escopo (importações / diagnóstico). */
export async function listarTodosCondominios(): Promise<Condominio[]> {
  return listCondominiums();
}

export function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}
