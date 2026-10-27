import {
  escopoCondominios,
  getCadastros,
  opcoesAdvogadosResponsaveis,
  proximoNumero,
  registrarAuditoria,
  setCondominios,
  statusCondominio,
  type Condominio,
  type StatusCondominio,
} from "@/data/catalogo";

export type CondominioInput = Omit<Condominio, "id"> & { id?: number };

export class CondominioServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function condominioNoEscopo(userId: number, condominioId: number) {
  const ids = new Set(escopoCondominios(getCadastros(), userId).map((item) => item.id));
  if (!ids.has(condominioId)) {
    throw new CondominioServiceError("Condomínio fora do seu escopo de acesso.", 403);
  }
}

function validarAdvogados(nomes: string[]) {
  const permitidos = new Set(opcoesAdvogadosResponsaveis(getCadastros()));
  if (nomes.length === 0) {
    throw new CondominioServiceError("Selecione ao menos um advogado responsável.", 400);
  }
  for (const nome of nomes) {
    if (!permitidos.has(nome)) {
      throw new CondominioServiceError("Advogado responsável inválido.", 400);
    }
  }
}

function validarEntrada(input: CondominioInput, editingId: number | null): Omit<Condominio, "id"> {
  const nome = input.nome.trim();
  if (!nome) {
    throw new CondominioServiceError("Informe o nome do condomínio.", 400);
  }
  validarAdvogados(input.advogados);

  const identificadorExterno = input.identificadorExterno.trim();
  if (identificadorExterno) {
    const chave = identificadorExterno.toLocaleLowerCase("pt-BR");
    const duplicado = getCadastros().condominios.some(
      (item) =>
        item.id !== editingId &&
        item.identificadorExterno.trim().toLocaleLowerCase("pt-BR") === chave,
    );
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

export function listarCondominios(userId: number): Condominio[] {
  return escopoCondominios(getCadastros(), userId);
}

export function criarCondominio(userId: number, input: CondominioInput, meta?: { ip?: string; userAgent?: string }) {
  const dados = validarEntrada(input, null);
  let nextId = input.id;
  if (nextId !== undefined) {
    if (!Number.isFinite(nextId) || nextId <= 0) {
      throw new CondominioServiceError("Identificador do condomínio inválido.", 400);
    }
    if (getCadastros().condominios.some((item) => item.id === nextId)) {
      throw new CondominioServiceError("Já existe um condomínio com este identificador interno.", 409);
    }
  } else {
    nextId = proximoNumero(getCadastros().condominios.map((item) => item.id));
  }

  const condominio: Condominio = { id: nextId, ...dados };
  setCondominios((current) => [...current, condominio]);
  registrarAuditoria(
    {
      entidade: "condominium",
      registroId: String(nextId),
      acao: "INSERT",
      dadosAnteriores: "",
      dadosNovos: condominio.nome,
      camposAlterados: "nome, identificador_externo, advogados, endereco",
    },
    userId,
    meta,
  );
  return condominio;
}

export function atualizarCondominio(
  userId: number,
  condominioId: number,
  input: CondominioInput,
  meta?: { ip?: string; userAgent?: string },
) {
  const atual = getCadastros().condominios.find((item) => item.id === condominioId);
  if (!atual) {
    throw new CondominioServiceError("Condomínio não encontrado.", 404);
  }
  condominioNoEscopo(userId, condominioId);
  const dados = validarEntrada(input, condominioId);
  const atualizado: Condominio = { id: condominioId, ...dados };
  setCondominios((current) => current.map((item) => (item.id === condominioId ? atualizado : item)));
  registrarAuditoria(
    {
      entidade: "condominium",
      registroId: String(condominioId),
      acao: "UPDATE",
      dadosAnteriores: atual.nome,
      dadosNovos: atualizado.nome,
      camposAlterados: "nome, identificador_externo, advogados, endereco, status",
    },
    userId,
    meta,
  );
  return atualizado;
}

export function alterarStatusCondominio(
  userId: number,
  condominioId: number,
  status: StatusCondominio,
  meta?: { ip?: string; userAgent?: string },
) {
  const atual = getCadastros().condominios.find((item) => item.id === condominioId);
  if (!atual) {
    throw new CondominioServiceError("Condomínio não encontrado.", 404);
  }
  condominioNoEscopo(userId, condominioId);
  if (!statusCondominio.includes(status)) {
    throw new CondominioServiceError("Situação do condomínio inválida.", 400);
  }
  if (atual.status === status) return atual;

  const atualizado = { ...atual, status };
  setCondominios((current) => current.map((item) => (item.id === condominioId ? atualizado : item)));
  registrarAuditoria(
    {
      entidade: "condominium",
      registroId: String(condominioId),
      acao: "UPDATE",
      dadosAnteriores: JSON.stringify({ status: atual.status }),
      dadosNovos: JSON.stringify({ status }),
      camposAlterados: "status",
    },
    userId,
    meta,
  );
  return atualizado;
}

export function excluirCondominio(userId: number, condominioId: number, meta?: { ip?: string; userAgent?: string }) {
  const atual = getCadastros().condominios.find((item) => item.id === condominioId);
  if (!atual) {
    throw new CondominioServiceError("Condomínio não encontrado.", 404);
  }
  condominioNoEscopo(userId, condominioId);

  const cadastros = getCadastros();
  const unidadeIds = new Set(
    cadastros.unidades.filter((item) => item.condominioId === condominioId).map((item) => item.id),
  );
  const temHistorico =
    unidadeIds.size > 0 ||
    cadastros.debitos.some((item) => item.condominioId === condominioId) ||
    cadastros.atendimentos.some((item) => unidadeIds.has(Number(item.unidadeId))) ||
    cadastros.atribuicoesCobranca.some((item) => unidadeIds.has(item.unidadeId));

  if (temHistorico) {
    throw new CondominioServiceError(
      "Condomínio com unidades ou histórico de cobrança. Inative o condomínio em vez de excluir.",
      409,
    );
  }

  setCondominios((current) => current.filter((item) => item.id !== condominioId));
  registrarAuditoria(
    {
      entidade: "condominium",
      registroId: String(condominioId),
      acao: "DELETE",
      dadosAnteriores: JSON.stringify(atual),
      dadosNovos: "",
      camposAlterados: "nome",
    },
    userId,
    meta,
  );
}

export function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}
