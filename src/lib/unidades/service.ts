import { debitoEmAberto, formatarData, SITUACAO_COBRANCA_PADRAO, situacaoCobrancaUnidade, situacoesUnidade, statusUnidade, tiposUnidade, tiposVinculo, type Responsavel, type Unidade, type Vinculo } from "@/data/catalogo";
import { invalidateServiceContextCache, scopeCondominiumIds } from "@/lib/db/service-context";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import { findCondominiumById } from "@/lib/db/repositories/condominium-repository";
import { listDebtsByUnit } from "@/lib/db/repositories/debt-repository";
import {
  createResponsibleParty,
  findResponsiblePartyByTaxId,
  findResponsiblePartyById,
  nextResponsiblePartyId,
} from "@/lib/db/repositories/responsible-party-repository";
import { listServiceTickets } from "@/lib/db/repositories/service-ticket-repository";
import {
  clearPrimaryLinksForUnit,
  createUnit,
  createUnitLink,
  deleteUnit,
  deleteUnitLink,
  findUnitById,
  findUnitLinkById,
  listUnitLinks,
  listUnitLinksByUnit,
  listUnits,
  nextUnitId,
  nextUnitLinkId,
  unitIdentificationExists,
  updateUnit,
} from "@/lib/db/repositories/unit-repository";
import { responsavelParaResposta } from "@/lib/privacidade/dados-pessoais";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

export type UnidadeInput = {
  condominioId: number;
  identificacao: string;
  bloco?: string;
  tipo: string;
  status: string;
  situacao?: string;
};

export class UnidadeServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function assertCondominioNoEscopo(userId: number, condominioId: number) {
  const ids = await scopeCondominiumIds(userId);
  if (!ids.has(condominioId)) {
    throw new UnidadeServiceError("Condomínio fora do seu escopo de acesso.", 403);
  }
}

async function assertCondominioValido(condominioId: number) {
  const condominio = await findCondominiumById(condominioId);
  if (!condominio) {
    throw new UnidadeServiceError("Condomínio inválido.", 400);
  }
  return condominio;
}

function normalizarIdentificacao(identificacao: string) {
  return identificacao.trim();
}

async function validarEntrada(input: UnidadeInput, editingId: number | null) {
  const identificacao = normalizarIdentificacao(input.identificacao);
  if (!input.condominioId) {
    throw new UnidadeServiceError("Selecione o condomínio.", 400);
  }
  if (!identificacao) {
    throw new UnidadeServiceError("Informe a identificação da unidade.", 400);
  }
  if (!tiposUnidade.includes(input.tipo as (typeof tiposUnidade)[number])) {
    throw new UnidadeServiceError("Tipo de unidade inválido.", 400);
  }
  if (!statusUnidade.includes(input.status as (typeof statusUnidade)[number])) {
    throw new UnidadeServiceError("Situação da unidade inválida.", 400);
  }
  const situacao = situacaoCobrancaUnidade({ situacao: input.situacao ?? SITUACAO_COBRANCA_PADRAO });
  if (!situacoesUnidade.includes(situacao as (typeof situacoesUnidade)[number])) {
    throw new UnidadeServiceError("Situação de cobrança inválida.", 400);
  }

  const duplicada = await unitIdentificationExists(input.condominioId, identificacao, editingId);
  if (duplicada) {
    throw new UnidadeServiceError("Já existe esta identificação neste condomínio.", 409);
  }

  return {
    condominioId: input.condominioId,
    identificacao,
    bloco: (input.bloco ?? "").trim(),
    tipo: input.tipo,
    status: input.status,
    situacao,
  };
}

async function unidadeNoEscopo(userId: number, unidade: Unidade) {
  await assertCondominioNoEscopo(userId, unidade.condominioId);
}

export async function listarUnidades(userId: number): Promise<Unidade[]> {
  const ids = await scopeCondominiumIds(userId);
  const todas = await listUnits();
  return todas.filter((item) => ids.has(item.condominioId));
}

export async function obterUnidadeDetalhe(userId: number, unidadeId: number) {
  const unidade = await findUnitById(unidadeId);
  if (!unidade) {
    throw new UnidadeServiceError("Unidade não encontrada.", 404);
  }
  await unidadeNoEscopo(userId, unidade);

  const perm = permissoesDoUsuarioId(userId);
  const vinculosRaw = await listUnitLinksByUnit(unidadeId);
  const vinculos = await Promise.all(
    vinculosRaw.map(async (vinculo) => {
      const responsavel = await findResponsiblePartyById(vinculo.responsavelId);
      return {
        ...vinculo,
        responsavel: responsavel ? responsavelParaResposta(responsavel, perm) : null,
      };
    }),
  );

  const debitos = await listDebtsByUnit(unidadeId);
  const atendimentos = (await listServiceTickets()).filter(
    (item) => String(item.unidadeId) === String(unidadeId),
  );
  const debitosAbertos = debitos.filter(debitoEmAberto);
  const valorAberto = debitosAbertos.reduce((sum, item) => sum + Number(item.valorAtualizado || 0), 0);

  const ultimosDebitos = [...debitos]
    .sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      referencia: item.referencia,
      status: item.status,
      dataVencimento: item.dataVencimento,
      valorAtualizado: item.valorAtualizado,
    }));

  const ultimosAtendimentos = [...atendimentos]
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora))
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      dataHora: item.dataHora,
      canal: item.canal,
      assunto: item.assunto,
      status: item.status,
    }));

  return {
    unidade,
    vinculos,
    resumo: {
      debitosAbertos: debitosAbertos.length,
      valorAberto,
      totalDebitos: debitos.length,
      totalAtendimentos: atendimentos.length,
      ultimosDebitos,
      ultimosAtendimentos,
    },
  };
}

export async function criarUnidade(
  userId: number,
  input: UnidadeInput,
  meta?: { ip?: string; userAgent?: string },
  opcoes?: { ignorarEscopo?: boolean },
) {
  await assertCondominioValido(input.condominioId);
  if (!opcoes?.ignorarEscopo) {
    await assertCondominioNoEscopo(userId, input.condominioId);
  }
  const dados = await validarEntrada(input, null);
  const nextId = await nextUnitId();
  const unidade: Unidade = { id: nextId, ...dados };
  const criada = await createUnit(unidade);
  invalidateServiceContextCache();
  await writeAuditLog({
    entity: "unit",
    recordId: String(nextId),
    action: "INSERT",
    previousData: "",
    newData: JSON.stringify(criada),
    changedFields: "condominio_id, identificacao, bloco, tipo, status, situacao",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return criada;
}

export async function atualizarUnidade(
  userId: number,
  unidadeId: number,
  input: UnidadeInput,
  meta?: { ip?: string; userAgent?: string },
) {
  const atual = await findUnitById(unidadeId);
  if (!atual) {
    throw new UnidadeServiceError("Unidade não encontrada.", 404);
  }
  await unidadeNoEscopo(userId, atual);
  await assertCondominioValido(input.condominioId);
  await assertCondominioNoEscopo(userId, input.condominioId);
  const dados = await validarEntrada(input, unidadeId);
  const atualizada: Unidade = { id: unidadeId, ...dados };
  const salva = await updateUnit(atualizada);
  invalidateServiceContextCache();
  await writeAuditLog({
    entity: "unit",
    recordId: String(unidadeId),
    action: "UPDATE",
    previousData: JSON.stringify(atual),
    newData: JSON.stringify(salva),
    changedFields: "condominio_id, identificacao, bloco, tipo, status, situacao",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return salva;
}

export async function excluirUnidade(userId: number, unidadeId: number, meta?: { ip?: string; userAgent?: string }) {
  const alvo = await findUnitById(unidadeId);
  if (!alvo) {
    throw new UnidadeServiceError("Unidade não encontrada.", 404);
  }
  await unidadeNoEscopo(userId, alvo);
  const [vinculos, debitos, tickets] = await Promise.all([
    listUnitLinksByUnit(unidadeId),
    listDebtsByUnit(unidadeId),
    listServiceTickets(),
  ]);
  const emUso =
    vinculos.length > 0 ||
    debitos.length > 0 ||
    tickets.some((item) => item.unidadeId === String(unidadeId));
  if (emUso) {
    throw new UnidadeServiceError(
      "Unidade com vínculos ou histórico. Inative a unidade em vez de excluir.",
      409,
    );
  }
  await deleteUnit(unidadeId);
  invalidateServiceContextCache();
  await writeAuditLog({
    entity: "unit",
    recordId: String(unidadeId),
    action: "DELETE",
    previousData: JSON.stringify(alvo),
    newData: "",
    changedFields: "identificacao",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
}

export type VinculoInput = {
  responsavelId?: number;
  responsavel?: Omit<Responsavel, "id">;
  tipoVinculo: string;
  principal?: boolean;
  observacoes?: string;
};

function normalizarCpfCnpj(valor: string) {
  return valor.replace(/\D/g, "");
}

export async function vincularResponsavel(
  userId: number,
  unidadeId: number,
  input: VinculoInput,
  meta?: { ip?: string; userAgent?: string },
) {
  const unidade = await findUnitById(unidadeId);
  if (!unidade) {
    throw new UnidadeServiceError("Unidade não encontrada.", 404);
  }
  await unidadeNoEscopo(userId, unidade);

  if (!tiposVinculo.includes(input.tipoVinculo as (typeof tiposVinculo)[number])) {
    throw new UnidadeServiceError("Tipo de vínculo inválido.", 400);
  }

  let responsavelId = input.responsavelId;
  if (input.responsavel) {
    const cpf = normalizarCpfCnpj(input.responsavel.cpfCnpj);
    if (!input.responsavel.nome.trim() || !cpf) {
      throw new UnidadeServiceError("Informe nome e CPF/CNPJ do responsável.", 400);
    }
    const existente = await findResponsiblePartyByTaxId(cpf);
    if (existente) {
      responsavelId = existente.id;
    } else {
      const nextId = await nextResponsiblePartyId();
      const novo: Responsavel = { id: nextId, ...input.responsavel, cpfCnpj: input.responsavel.cpfCnpj.trim() };
      await createResponsibleParty(novo);
      responsavelId = nextId;
      await writeAuditLog({
        entity: "responsible_party",
        recordId: String(nextId),
        action: "INSERT",
        previousData: "",
        newData: JSON.stringify({ id: nextId, nome: novo.nome }),
        changedFields: "nome, cpf_cnpj, tipo_pessoa",
        userId,
        ip: meta?.ip,
        userAgent: meta?.userAgent,
      });
    }
  }

  if (!responsavelId) {
    throw new UnidadeServiceError("Selecione ou cadastre um responsável.", 400);
  }

  const responsavel = await findResponsiblePartyById(responsavelId);
  if (!responsavel) {
    throw new UnidadeServiceError("Responsável inválido.", 400);
  }

  const principal = input.principal ?? false;
  if (principal) {
    await clearPrimaryLinksForUnit(unidadeId);
  }

  const vinculosUnidade = await listUnitLinksByUnit(unidadeId);
  const duplicado = vinculosUnidade.some(
    (item) => item.responsavelId === responsavelId && item.tipoVinculo === input.tipoVinculo,
  );
  if (duplicado) {
    throw new UnidadeServiceError("Este vínculo já existe para a unidade.", 409);
  }

  const vinculoId = await nextUnitLinkId();
  const vinculo: Vinculo = {
    id: vinculoId,
    unidadeId,
    responsavelId,
    tipoVinculo: input.tipoVinculo,
    principal,
    observacoes: (input.observacoes ?? "").trim(),
  };
  const criado = await createUnitLink(vinculo);
  await writeAuditLog({
    entity: "unit_responsible_party",
    recordId: String(vinculoId),
    action: "INSERT",
    previousData: "",
    newData: JSON.stringify(criado),
    changedFields: "unidade_id, responsavel_id, tipo_vinculo, principal",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return criado;
}

export async function removerVinculo(
  userId: number,
  unidadeId: number,
  vinculoId: number,
  meta?: { ip?: string; userAgent?: string },
) {
  const unidade = await findUnitById(unidadeId);
  if (!unidade) {
    throw new UnidadeServiceError("Unidade não encontrada.", 404);
  }
  await unidadeNoEscopo(userId, unidade);
  const vinculo = await findUnitLinkById(vinculoId);
  if (!vinculo || vinculo.unidadeId !== unidadeId) {
    throw new UnidadeServiceError("Vínculo não encontrado.", 404);
  }
  await deleteUnitLink(vinculoId);
  await writeAuditLog({
    entity: "unit_responsible_party",
    recordId: String(vinculoId),
    action: "DELETE",
    previousData: JSON.stringify(vinculo),
    newData: "",
    changedFields: "tipo_vinculo, responsavel_id",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
}

/** Lista vínculos (escopo administrativo). */
export async function listarVinculosUnidades(): Promise<Vinculo[]> {
  return listUnitLinks();
}

export function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}

export { formatarData };
