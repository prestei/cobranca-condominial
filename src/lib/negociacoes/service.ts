import { agoraIso, escopoUnidades, statusPropostaNegociacao, type PropostaNegociacao } from "@/data/catalogo";
import { loadCadastrosForScope } from "@/lib/db/cadastros-scope";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import { findDebtById } from "@/lib/db/repositories/debt-repository";
import {
  createNegotiationProposal,
  findNegotiationProposalById,
  listNegotiationProposals,
  updateNegotiationProposal,
} from "@/lib/db/repositories/negotiation-repository";
import { openAssignmentForUnit, requireUnitInScope } from "@/lib/db/service-context";
import { temPermissao } from "@/lib/permissions/check";
import { resolverPermissoesUsuario } from "@/lib/permissions/resolver";
import {
  calcularTotaisDebitos,
  carregarRegraAdvogadoResponsavel,
  validarAlcadaNegociacao,
} from "@/lib/negociacoes/alcada";
import { montarDetalheProposta, type PropostaNegociacaoDetalhe } from "@/lib/negociacoes/detalhe";
import { gerarCronogramaParcelasPadrao } from "@/lib/negociacoes/gerar-cronograma";

export class PropostaNegociacaoServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detalhes?: string[],
  ) {
    super(message);
  }
}

export type PropostaNegociacaoInput = {
  condominioId: number;
  unidadeId: number;
  valorProposto: string;
  observacoes?: string;
  debitoIds: number[];
  quantidadeParcelas?: number | null;
};

export type PropostaNegociacaoStatusInput = {
  status: string;
  termosAprovados?: string;
  /** Ao aceitar: gera cronograma quando informado com quantidadeParcelas da proposta. */
  primeiroVencimento?: string;
};

export type PropostaNegociacaoFiltros = {
  unidadeId?: number;
  status?: string;
};

async function permissoesUsuario(userId: number) {
  return resolverPermissoesUsuario(userId);
}

async function usuarioAdministradora(userId: number) {
  const perm = await permissoesUsuario(userId);
  return temPermissao(perm, "usuarios", "criar");
}

async function idsUnidadeNoEscopo(userId: number): Promise<Set<number>> {
  const cadastros = await loadCadastrosForScope();
  return new Set(escopoUnidades(cadastros, userId).map((item) => item.id));
}

async function assertUnidadeNoEscopo(userId: number, unidadeId: number, condominioId: number) {
  try {
    return await requireUnitInScope(userId, unidadeId, condominioId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNIT_NOT_FOUND") {
      throw new PropostaNegociacaoServiceError("Unidade não encontrada.", 404);
    }
    if (code === "UNIT_CONDO_MISMATCH") {
      throw new PropostaNegociacaoServiceError("A unidade não pertence ao condomínio selecionado.", 400);
    }
    if (code === "UNIT_OUT_OF_SCOPE") {
      throw new PropostaNegociacaoServiceError("Unidade fora do seu escopo de acesso.", 403);
    }
    if (code === "CONDO_OUT_OF_SCOPE") {
      throw new PropostaNegociacaoServiceError("Condomínio fora do seu escopo de acesso.", 403);
    }
    throw error;
  }
}

async function assertCarteiraParaRegistrar(userId: number, unidadeId: number) {
  if (await usuarioAdministradora(userId)) return;
  const perm = await permissoesUsuario(userId);
  if (temPermissao(perm, "negociacoes", "editar") && !temPermissao(perm, "atendimentos", "criar")) {
    return;
  }
  const vigente = await openAssignmentForUnit(unidadeId);
  if (!vigente || vigente.atendenteId !== userId) {
    throw new PropostaNegociacaoServiceError(
      "Esta cobrança não está na sua carteira. Peça redistribuição à administradora.",
      403,
    );
  }
}

async function propostaVisivelParaUsuario(userId: number, proposta: PropostaNegociacao): Promise<boolean> {
  if (await usuarioAdministradora(userId)) return true;

  const perm = await permissoesUsuario(userId);
  const cadastros = await loadCadastrosForScope();
  const usuario = cadastros.usuarios.find((item) => item.id === userId);

  if (proposta.advogadoResponsavelId === userId) return true;
  if (temPermissao(perm, "negociacoes", "ler") && usuario) {
    const condominio = cadastros.condominios.find((item) => item.id === proposta.condominioId);
    if (condominio?.advogados.includes(usuario.nome)) return true;
  }

  if (temPermissao(perm, "atendimentos", "ler")) {
    if (proposta.usuarioId === userId) return true;
    const vigente = await openAssignmentForUnit(proposta.unidadeId);
    if (vigente?.atendenteId === userId) return true;
  }

  return false;
}

async function assertLeituraProposta(userId: number, proposta: PropostaNegociacao) {
  await assertUnidadeNoEscopo(userId, proposta.unidadeId, proposta.condominioId);
  if (!(await propostaVisivelParaUsuario(userId, proposta))) {
    throw new PropostaNegociacaoServiceError("Proposta fora do seu escopo de acesso.", 403);
  }
}

function normalizarValorMonetario(raw: string): string {
  const limpo = raw.trim().replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  if (!limpo) {
    throw new PropostaNegociacaoServiceError("Informe o valor proposto.", 400);
  }
  const numero = Number(limpo);
  if (!Number.isFinite(numero) || numero <= 0) {
    throw new PropostaNegociacaoServiceError("Valor proposto inválido.", 400);
  }
  return numero.toFixed(2);
}

function normalizarQuantidadeParcelas(raw: number | null | undefined): number | null {
  if (raw == null || raw === undefined) return null;
  const numero = Number(raw);
  if (!Number.isFinite(numero) || numero < 1) {
    throw new PropostaNegociacaoServiceError("Quantidade de parcelas inválida.", 400);
  }
  return Math.floor(numero);
}

async function validarDebitos(unidadeId: number, debitoIds: number[]) {
  if (!Array.isArray(debitoIds) || debitoIds.length === 0) {
    throw new PropostaNegociacaoServiceError("Selecione ao menos um débito vinculado à proposta.", 400);
  }
  const idsUnicos = [...new Set(debitoIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (idsUnicos.length === 0) {
    throw new PropostaNegociacaoServiceError("Débitos inválidos.", 400);
  }
  const debitos = [];
  for (const id of idsUnicos) {
    const debito = await findDebtById(id);
    if (!debito) {
      throw new PropostaNegociacaoServiceError(`Débito ${id} não encontrado.`, 400);
    }
    if (debito.unidadeId !== unidadeId) {
      throw new PropostaNegociacaoServiceError("Todos os débitos devem pertencer à mesma unidade.", 400);
    }
    debitos.push(debito);
  }
  return { idsUnicos, debitos };
}

async function validarEntrada(input: PropostaNegociacaoInput, userId: number, pularAlcada: boolean) {
  if (!Number.isFinite(input.condominioId) || input.condominioId <= 0) {
    throw new PropostaNegociacaoServiceError("Selecione o condomínio.", 400);
  }
  if (!Number.isFinite(input.unidadeId) || input.unidadeId <= 0) {
    throw new PropostaNegociacaoServiceError("Selecione a unidade.", 400);
  }
  const valorProposto = normalizarValorMonetario(input.valorProposto);
  const quantidadeParcelas = normalizarQuantidadeParcelas(input.quantidadeParcelas);
  const { idsUnicos, debitos } = await validarDebitos(input.unidadeId, input.debitoIds);
  const totais = calcularTotaisDebitos(debitos);
  const { regra } = await carregarRegraAdvogadoResponsavel(input.condominioId);
  const alcada = validarAlcadaNegociacao(
    regra,
    { valorDividaAtualizada: totais.atualizado, valorProposto, quantidadeParcelas },
    { pularValidacao: pularAlcada },
  );
  if (!alcada.ok) {
    throw new PropostaNegociacaoServiceError(alcada.mensagens[0] ?? "Condições fora da alçada autorizada.", 400, alcada.mensagens);
  }
  return {
    valorProposto,
    observacoes: (input.observacoes ?? "").trim(),
    debitoIds: idsUnicos,
    quantidadeParcelas,
    totais,
  };
}

const TRANSICOES_STATUS: Record<string, Set<string>> = {
  "Em análise": new Set(["Aceita", "Recusada", "Cancelada"]),
  Aceita: new Set(),
  Recusada: new Set(),
  Cancelada: new Set(),
};

function validarTransicaoStatus(anterior: string, proximo: string) {
  if (anterior === proximo) return;
  const permitidos = TRANSICOES_STATUS[anterior];
  if (!permitidos || !permitidos.has(proximo)) {
    throw new PropostaNegociacaoServiceError(
      `Não é possível alterar o status de "${anterior}" para "${proximo}".`,
      409,
    );
  }
}

export async function listarPropostasNegociacao(
  userId: number,
  filtros?: PropostaNegociacaoFiltros,
): Promise<PropostaNegociacao[]> {
  const idsUnidade = await idsUnidadeNoEscopo(userId);
  let lista = (await listNegotiationProposals()).filter((item) => idsUnidade.has(item.unidadeId));

  const visiveis: PropostaNegociacao[] = [];
  for (const item of lista) {
    if (await propostaVisivelParaUsuario(userId, item)) visiveis.push(item);
  }
  lista = visiveis;

  if (filtros?.unidadeId) {
    lista = lista.filter((item) => item.unidadeId === filtros.unidadeId);
  }
  if (filtros?.status && filtros.status !== "todos") {
    lista = lista.filter((item) => item.status === filtros.status);
  }
  return [...lista].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export async function obterPropostaNegociacao(userId: number, id: string): Promise<PropostaNegociacao> {
  const proposta = await findNegotiationProposalById(id);
  if (!proposta) {
    throw new PropostaNegociacaoServiceError("Proposta não encontrada.", 404);
  }
  await assertLeituraProposta(userId, proposta);
  return proposta;
}

export async function obterPropostaNegociacaoDetalhe(userId: number, id: string): Promise<PropostaNegociacaoDetalhe> {
  const proposta = await obterPropostaNegociacao(userId, id);
  return montarDetalheProposta(proposta);
}

export async function criarPropostaNegociacao(
  userId: number,
  input: PropostaNegociacaoInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<PropostaNegociacao> {
  const pularAlcada = await usuarioAdministradora(userId);
  const dados = await validarEntrada(input, userId, pularAlcada);
  await assertUnidadeNoEscopo(userId, input.unidadeId, input.condominioId);
  await assertCarteiraParaRegistrar(userId, input.unidadeId);

  const { advogadoId } = await carregarRegraAdvogadoResponsavel(input.condominioId);

  const registro: PropostaNegociacao = {
    id: crypto.randomUUID(),
    condominioId: input.condominioId,
    unidadeId: input.unidadeId,
    usuarioId: userId,
    criadoEm: agoraIso(),
    status: "Em análise",
    valorProposto: dados.valorProposto,
    observacoes: dados.observacoes,
    debitoIds: dados.debitoIds,
    acordoConfirmadoEm: "",
    acordoConfirmadoPorId: null,
    termosAprovados: "",
    advogadoResponsavelId: advogadoId,
    valorDividaOriginal: dados.totais.original,
    valorDividaAtualizada: dados.totais.atualizado,
    quantidadeParcelas: dados.quantidadeParcelas,
    valoresDefinidosPorId: userId,
    valoresAprovadosPorId: null,
  };

  const criada = await createNegotiationProposal(registro);
  await writeAuditLog({
    entity: "negotiation_proposal",
    recordId: criada.id,
    action: "INSERT",
    previousData: "",
    newData: JSON.stringify({
      unidadeId: criada.unidadeId,
      valorProposto: criada.valorProposto,
      status: criada.status,
      debitoIds: criada.debitoIds,
      quantidadeParcelas: criada.quantidadeParcelas,
      advogadoResponsavelId: criada.advogadoResponsavelId,
    }),
    changedFields: "unidade_id, valor_proposto, status, debito_ids, quantidade_parcelas, advogado_responsavel_id",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return criada;
}

export async function atualizarStatusPropostaNegociacao(
  userId: number,
  id: string,
  input: PropostaNegociacaoStatusInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<PropostaNegociacao> {
  const perm = await permissoesUsuario(userId);
  const podeEditarAtendimento = temPermissao(perm, "atendimentos", "editar");
  const podeEditarNegociacao = temPermissao(perm, "negociacoes", "editar");
  if (!podeEditarAtendimento && !podeEditarNegociacao) {
    throw new PropostaNegociacaoServiceError("Sem permissão para alterar o status da proposta.", 403);
  }

  const anterior = await findNegotiationProposalById(id);
  if (!anterior) {
    throw new PropostaNegociacaoServiceError("Proposta não encontrada.", 404);
  }
  await assertLeituraProposta(userId, anterior);

  const status = input.status.trim();
  if (!statusPropostaNegociacao.includes(status as (typeof statusPropostaNegociacao)[number])) {
    throw new PropostaNegociacaoServiceError("Status da proposta inválido.", 400);
  }
  validarTransicaoStatus(anterior.status, status);

  const pularAlcada = await usuarioAdministradora(userId);
  if (status === "Aceita") {
    const { regra } = await carregarRegraAdvogadoResponsavel(anterior.condominioId);
    const alcada = validarAlcadaNegociacao(
      regra,
      {
        valorDividaAtualizada: anterior.valorDividaAtualizada || "0",
        valorProposto: anterior.valorProposto,
        quantidadeParcelas: anterior.quantidadeParcelas,
      },
      { pularValidacao: pularAlcada },
    );
    if (!alcada.ok) {
      throw new PropostaNegociacaoServiceError(
        alcada.mensagens[0] ?? "Não é possível aprovar condições fora da alçada.",
        403,
        alcada.mensagens,
      );
    }
    if (
      podeEditarNegociacao &&
      !podeEditarAtendimento &&
      anterior.advogadoResponsavelId != null &&
      anterior.advogadoResponsavelId !== userId &&
      !pularAlcada
    ) {
      throw new PropostaNegociacaoServiceError("Apenas o advogado responsável pode confirmar este acordo.", 403);
    }
  }

  let termosAprovados = anterior.termosAprovados;
  let acordoConfirmadoEm = anterior.acordoConfirmadoEm;
  let acordoConfirmadoPorId = anterior.acordoConfirmadoPorId;
  let valoresAprovadosPorId = anterior.valoresAprovadosPorId;

  if (status === "Aceita") {
    termosAprovados = (input.termosAprovados ?? "").trim();
    if (!termosAprovados) {
      throw new PropostaNegociacaoServiceError(
        "Informe os termos aprovados do acordo ao confirmar a proposta.",
        400,
      );
    }
    acordoConfirmadoEm = agoraIso();
    acordoConfirmadoPorId = userId;
    valoresAprovadosPorId = userId;
  }

  const atualizado: PropostaNegociacao = {
    ...anterior,
    status,
    termosAprovados,
    acordoConfirmadoEm,
    acordoConfirmadoPorId,
    valoresAprovadosPorId,
  };

  const salvo = await updateNegotiationProposal(atualizado);
  await writeAuditLog({
    entity: "negotiation_proposal",
    recordId: id,
    action: "UPDATE",
    previousData: JSON.stringify({ status: anterior.status }),
    newData: JSON.stringify({
      status: salvo.status,
      termosAprovados: salvo.termosAprovados,
      acordoConfirmadoEm: salvo.acordoConfirmadoEm,
      valoresAprovadosPorId: salvo.valoresAprovadosPorId,
    }),
    changedFields: "status, termos_aprovados, acordo_confirmado_em, valores_aprovados_por_id",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });

  if (status === "Aceita" && input.primeiroVencimento && salvo.quantidadeParcelas && salvo.quantidadeParcelas > 0) {
    try {
      await gerarCronogramaParcelasPadrao(userId, salvo, input.primeiroVencimento, meta);
    } catch {
      throw new PropostaNegociacaoServiceError(
        "Acordo confirmado, mas o cronograma automático de parcelas não pôde ser gerado.",
        500,
      );
    }
  }

  return salvo;
}

export function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}
