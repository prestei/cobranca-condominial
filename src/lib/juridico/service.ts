import { advogadoPrincipalCondominio, agoraIso, debitoEmAberto, formatarMoeda, opcoesAdvogadosResponsaveis, statusEncaminhamentoJuridico, type DocumentoJuridico, type EncaminhamentoJuridico } from "@/data/catalogo";
import { loadCadastrosForScope } from "@/lib/db/cadastros-scope";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import { findCondominiumById } from "@/lib/db/repositories/condominium-repository";
import { listDebts } from "@/lib/db/repositories/debt-repository";
import {
  createLegalDocument,
  createLegalReferral,
  findLegalReferralById,
  listLegalDocumentsByReferral,
  listLegalReferrals,
  updateLegalReferral,
} from "@/lib/db/repositories/legal-repository";
import { requireUnitInScope, scopeCondominiumIds } from "@/lib/db/service-context";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

export class JuridicoServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detalhes?: string[],
  ) {
    super(message);
  }
}

export type EncaminhamentoJuridicoInput = {
  condominioId: number;
  unidadeId: number;
  advogadoResponsavel?: string;
  observacoes?: string;
  resumoContexto?: string;
  debitoIds?: number[];
};

export type EncaminhamentoJuridicoAtualizacaoInput = {
  status?: string;
  advogadoResponsavel?: string;
  observacoes?: string;
};

export type DocumentoJuridicoInput = {
  titulo: string;
  descricao?: string;
  referenciaArquivo?: string;
};

export type EncaminhamentoJuridicoFiltros = {
  unidadeId?: number;
  condominioId?: number;
  status?: string;
  advogado?: string;
};

export type EncaminhamentoJuridicoDetalhe = EncaminhamentoJuridico & {
  documentos?: DocumentoJuridico[];
};

const TRANSICOES_STATUS: Record<string, Set<string>> = {
  Encaminhado: new Set(["Em análise", "Retornado à cobrança amigável", "Arquivado"]),
  "Em análise": new Set([
    "Documentação pendente",
    "Aguardando decisão",
    "Retornado à cobrança amigável",
    "Arquivado",
  ]),
  "Documentação pendente": new Set(["Em análise", "Aguardando decisão", "Arquivado"]),
  "Aguardando decisão": new Set([
    "Em análise",
    "Pronto para ajuizamento",
    "Retornado à cobrança amigável",
    "Arquivado",
  ]),
  "Pronto para ajuizamento": new Set(["Arquivado", "Retornado à cobrança amigável"]),
  "Retornado à cobrança amigável": new Set(),
  Arquivado: new Set(),
};

async function assertPermissaoJuridico(userId: number, acao: "ler" | "criar" | "editar") {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "juridico", acao)) {
    throw new JuridicoServiceError(`Sem permissão para ${acao === "ler" ? "consultar" : acao} encaminhamentos jurídicos.`, 403);
  }
}

async function assertUnidadeNoEscopo(userId: number, unidadeId: number, condominioId: number) {
  try {
    return await requireUnitInScope(userId, unidadeId, condominioId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNIT_NOT_FOUND") {
      throw new JuridicoServiceError("Unidade não encontrada.", 404);
    }
    if (code === "UNIT_CONDO_MISMATCH") {
      throw new JuridicoServiceError("A unidade não pertence ao condomínio selecionado.", 400);
    }
    if (code === "CONDO_OUT_OF_SCOPE") {
      throw new JuridicoServiceError("Condomínio fora do seu escopo de acesso.", 403);
    }
    throw error;
  }
}

async function validarAdvogadoResponsavel(condominioId: number, nome: string) {
  const condominio = await findCondominiumById(condominioId);
  if (!condominio) {
    throw new JuridicoServiceError("Condomínio não encontrado.", 404);
  }
  const cadastros = await loadCadastrosForScope();
  const permitidos = new Set(opcoesAdvogadosResponsaveis(cadastros));
  const advogado = nome.trim();
  if (!advogado) {
    throw new JuridicoServiceError("Informe o advogado responsável.", 400);
  }
  if (!permitidos.has(advogado)) {
    throw new JuridicoServiceError("Advogado responsável inválido.", 400);
  }
  if (!condominio.advogados.includes(advogado)) {
    throw new JuridicoServiceError("O advogado deve estar vinculado ao condomínio.", 400);
  }
  return advogado;
}

async function validarDebitos(unidadeId: number, debitoIds: number[] | undefined) {
  if (!debitoIds || debitoIds.length === 0) return [] as number[];
  const idsUnicos = [...new Set(debitoIds.filter((id) => Number.isFinite(id) && id > 0))];
  const debitos = await listDebts();
  for (const id of idsUnicos) {
    const debito = debitos.find((item) => item.id === id);
    if (!debito) {
      throw new JuridicoServiceError(`Débito ${id} não encontrado.`, 400);
    }
    if (debito.unidadeId !== unidadeId) {
      throw new JuridicoServiceError("Todos os débitos devem pertencer à mesma unidade.", 400);
    }
  }
  return idsUnicos;
}

function validarTransicaoStatus(anterior: string, proximo: string) {
  if (anterior === proximo) return;
  const permitidos = TRANSICOES_STATUS[anterior];
  if (!permitidos || !permitidos.has(proximo)) {
    throw new JuridicoServiceError(`Não é possível alterar o status de "${anterior}" para "${proximo}".`, 409);
  }
}

async function incluirDocumentos(userId: number, encaminhamento: EncaminhamentoJuridico): Promise<EncaminhamentoJuridicoDetalhe> {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "juridico", "ler")) {
    return encaminhamento;
  }
  const documentos = await listLegalDocumentsByReferral(encaminhamento.id);
  return {
    ...encaminhamento,
    documentos: [...documentos].sort((a, b) => b.registradoEm.localeCompare(a.registradoEm)),
  };
}

export async function listarEncaminhamentosJuridicos(
  userId: number,
  filtros?: EncaminhamentoJuridicoFiltros,
): Promise<EncaminhamentoJuridicoDetalhe[]> {
  await assertPermissaoJuridico(userId, "ler");
  const idsCondominio = await scopeCondominiumIds(userId);
  let lista = (await listLegalReferrals()).filter((item) => idsCondominio.has(item.condominioId));

  if (filtros?.unidadeId) {
    lista = lista.filter((item) => item.unidadeId === filtros.unidadeId);
  }
  if (filtros?.condominioId) {
    lista = lista.filter((item) => item.condominioId === filtros.condominioId);
  }
  if (filtros?.status && filtros.status !== "todos") {
    lista = lista.filter((item) => item.status === filtros.status);
  }
  if (filtros?.advogado && filtros.advogado !== "todos") {
    lista = lista.filter((item) => item.advogadoResponsavel === filtros.advogado);
  }

  const ordenados = [...lista].sort((a, b) => b.encaminhadoEm.localeCompare(a.encaminhadoEm));
  return Promise.all(ordenados.map((item) => incluirDocumentos(userId, item)));
}

export async function obterEncaminhamentoJuridico(userId: number, id: string): Promise<EncaminhamentoJuridicoDetalhe> {
  await assertPermissaoJuridico(userId, "ler");
  const encaminhamento = await findLegalReferralById(id);
  if (!encaminhamento) {
    throw new JuridicoServiceError("Encaminhamento não encontrado.", 404);
  }
  const idsCondominio = await scopeCondominiumIds(userId);
  if (!idsCondominio.has(encaminhamento.condominioId)) {
    throw new JuridicoServiceError("Encaminhamento fora do seu escopo de acesso.", 403);
  }
  return incluirDocumentos(userId, encaminhamento);
}

async function montarResumoContexto(unidadeId: number, debitoIds: number[], textoExtra: string) {
  const debitos = await listDebts();
  const selecionados =
    debitoIds.length > 0
      ? debitos.filter((item) => debitoIds.includes(item.id))
      : debitos.filter((item) => item.unidadeId === unidadeId && debitoEmAberto(item));
  const valor = selecionados.reduce((sum, item) => sum + Number(item.valorAtualizado || 0), 0);
  const partes = [
    `${selecionados.length} débito(s) em aberto`,
    valor > 0 ? `Total atualizado: ${formatarMoeda(String(valor))}` : "",
    textoExtra.trim(),
  ].filter(Boolean);
  return partes.join(" · ");
}

export async function criarEncaminhamentoJuridico(
  userId: number,
  input: EncaminhamentoJuridicoInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<EncaminhamentoJuridico> {
  await assertPermissaoJuridico(userId, "criar");
  if (!Number.isFinite(input.condominioId) || input.condominioId <= 0) {
    throw new JuridicoServiceError("Selecione o condomínio.", 400);
  }
  if (!Number.isFinite(input.unidadeId) || input.unidadeId <= 0) {
    throw new JuridicoServiceError("Selecione a unidade.", 400);
  }
  await assertUnidadeNoEscopo(userId, input.unidadeId, input.condominioId);

  const debitoIds = await validarDebitos(input.unidadeId, input.debitoIds);
  const condominio = await findCondominiumById(input.condominioId);
  const advogadoDefault = condominio ? advogadoPrincipalCondominio(condominio) : "";
  const advogadoResponsavel = await validarAdvogadoResponsavel(
    input.condominioId,
    (input.advogadoResponsavel ?? advogadoDefault).trim(),
  );

  const agora = agoraIso();
  const registro: EncaminhamentoJuridico = {
    id: crypto.randomUUID(),
    condominioId: input.condominioId,
    unidadeId: input.unidadeId,
    usuarioId: userId,
    encaminhadoEm: agora,
    status: "Encaminhado",
    advogadoResponsavel,
    observacoes: (input.observacoes ?? "").trim(),
    debitoIds,
    resumoContexto: await montarResumoContexto(input.unidadeId, debitoIds, input.resumoContexto ?? ""),
    atualizadoEm: agora,
    atualizadoPorId: userId,
  };

  const criado = await createLegalReferral(registro);
  await writeAuditLog({
    entity: "legal_case_referral",
    recordId: criado.id,
    action: "INSERT",
    previousData: "",
    newData: JSON.stringify({
      unidadeId: criado.unidadeId,
      status: criado.status,
      advogadoResponsavel: criado.advogadoResponsavel,
      debitoIds: criado.debitoIds,
    }),
    changedFields: "unidade_id, status, advogado_responsavel, debito_ids",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return criado;
}

export async function atualizarEncaminhamentoJuridico(
  userId: number,
  id: string,
  input: EncaminhamentoJuridicoAtualizacaoInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<EncaminhamentoJuridico> {
  await assertPermissaoJuridico(userId, "editar");
  const anterior = await findLegalReferralById(id);
  if (!anterior) {
    throw new JuridicoServiceError("Encaminhamento não encontrado.", 404);
  }
  const idsCondominio = await scopeCondominiumIds(userId);
  if (!idsCondominio.has(anterior.condominioId)) {
    throw new JuridicoServiceError("Encaminhamento fora do seu escopo de acesso.", 403);
  }

  let status = anterior.status;
  let advogadoResponsavel = anterior.advogadoResponsavel;
  let observacoes = anterior.observacoes;

  if (input.status !== undefined) {
    const proximo = input.status.trim();
    if (!statusEncaminhamentoJuridico.includes(proximo as (typeof statusEncaminhamentoJuridico)[number])) {
      throw new JuridicoServiceError("Status jurídico inválido.", 400);
    }
    validarTransicaoStatus(anterior.status, proximo);
    status = proximo;
  }

  if (input.advogadoResponsavel !== undefined) {
    advogadoResponsavel = await validarAdvogadoResponsavel(anterior.condominioId, input.advogadoResponsavel);
  }

  if (input.observacoes !== undefined) {
    observacoes = input.observacoes.trim();
  }

  const agora = agoraIso();
  const atualizado: EncaminhamentoJuridico = {
    ...anterior,
    status,
    advogadoResponsavel,
    observacoes,
    atualizadoEm: agora,
    atualizadoPorId: userId,
  };

  const salvo = await updateLegalReferral(atualizado);

  const campos: string[] = [];
  if (status !== anterior.status) campos.push("status");
  if (advogadoResponsavel !== anterior.advogadoResponsavel) campos.push("advogado_responsavel");
  if (observacoes !== anterior.observacoes) campos.push("observacoes");

  if (campos.length > 0) {
    await writeAuditLog({
      entity: "legal_case_referral",
      recordId: id,
      action: "UPDATE",
      previousData: JSON.stringify({
        status: anterior.status,
        advogadoResponsavel: anterior.advogadoResponsavel,
        observacoes: anterior.observacoes,
      }),
      newData: JSON.stringify({
        status: salvo.status,
        advogadoResponsavel: salvo.advogadoResponsavel,
        observacoes: salvo.observacoes,
      }),
      changedFields: campos.join(", "),
      userId,
      ip: meta?.ip,
      userAgent: meta?.userAgent,
    });
  }

  return salvo;
}

export async function registrarDocumentoJuridico(
  userId: number,
  encaminhamentoId: string,
  input: DocumentoJuridicoInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<DocumentoJuridico> {
  await assertPermissaoJuridico(userId, "editar");
  const encaminhamento = await findLegalReferralById(encaminhamentoId);
  if (!encaminhamento) {
    throw new JuridicoServiceError("Encaminhamento não encontrado.", 404);
  }
  const idsCondominio = await scopeCondominiumIds(userId);
  if (!idsCondominio.has(encaminhamento.condominioId)) {
    throw new JuridicoServiceError("Encaminhamento fora do seu escopo de acesso.", 403);
  }

  const titulo = input.titulo.trim();
  if (!titulo) {
    throw new JuridicoServiceError("Informe o título do documento.", 400);
  }

  const registro: DocumentoJuridico = {
    id: crypto.randomUUID(),
    encaminhamentoId,
    titulo,
    descricao: (input.descricao ?? "").trim(),
    referenciaArquivo: (input.referenciaArquivo ?? "").trim(),
    registradoEm: agoraIso(),
    registradoPorId: userId,
  };

  const criado = await createLegalDocument(registro);
  await writeAuditLog({
    entity: "legal_document",
    recordId: criado.id,
    action: "INSERT",
    previousData: "",
    newData: JSON.stringify({
      encaminhamentoId,
      titulo: criado.titulo,
      referenciaArquivo: criado.referenciaArquivo,
    }),
    changedFields: "encaminhamento_id, titulo, referencia_arquivo",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return criado;
}

export function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}
