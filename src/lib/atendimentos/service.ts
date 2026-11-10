import { agoraIso, canaisAtendimento, escopoCondominios, escopoUnidades, hojeIso, motivosPendencia, statusAtendimento, type Atendimento, type Cadastros } from "@/data/catalogo";
import {
  classificarAtendimentoOperacional,
  periodoUltimos7Dias,
  type IndicadorOperacionalAtendenteId,
} from "@/lib/dashboard/indicadores-operacionais-atendente";
import { loadCadastrosForScope, loadFullOperationalCadastros } from "@/lib/db/cadastros-scope";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import {
  createServiceTicket,
  deleteServiceTicket,
  findServiceTicketById,
  listServiceTickets,
  updateServiceTicket,
} from "@/lib/db/repositories/service-ticket-repository";
import {
  openAssignmentForUnit,
  requireUnitInScope,
  scopeUnitIds,
} from "@/lib/db/service-context";
import { listUnitLinksByUnit } from "@/lib/db/repositories/unit-repository";
import { emitirNotificacaoRetornoAgendado } from "@/lib/notificacoes/service";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

function serializarAtendimentoAuditoria(atendimento: Atendimento): string {
  return JSON.stringify({
    unidadeId: atendimento.unidadeId,
    responsavelId: atendimento.responsavelId,
    canal: atendimento.canal,
    respondeu: atendimento.respondeu,
    motivo: atendimento.motivo,
    assunto: atendimento.assunto,
    descricao: atendimento.descricao,
    status: atendimento.status,
    dataProximaAcao: atendimento.dataProximaAcao,
    proximaAcao: atendimento.proximaAcao,
    retornoConcluidoEm: atendimento.retornoConcluidoEm ?? "",
    retornoConcluidoPorId: atendimento.retornoConcluidoPorId ?? null,
  });
}

export class AtendimentoServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detalhes?: string[],
  ) {
    super(message);
  }
}

export type AtendimentoInput = {
  condominioId: number;
  unidadeId: number;
  responsavelId?: number | null;
  canal: string;
  respondeu: string;
  motivo?: string;
  assunto?: string;
  descricao?: string;
  status: string;
  dataProximaAcao?: string;
  proximaAcao?: string;
};

export type AtendimentoFiltros = {
  unidadeId?: number;
  status?: string;
  canal?: string;
  busca?: string;
  operacional?: IndicadorOperacionalAtendenteId;
  de?: string;
  ate?: string;
};

function usuarioVeCarteiraGeral(userId: number) {
  const perm = permissoesDoUsuarioId(userId);
  return temPermissao(perm, "usuarios", "criar");
}

function atendimentoNaCarteira(cadastros: Cadastros, userId: number, atendimento: Atendimento): boolean {
  const unidadeId = Number(atendimento.unidadeId);
  const unidade = cadastros.unidades.find((item) => item.id === unidadeId);
  if (!unidade) return false;
  const idsCondominio = new Set(escopoCondominios(cadastros, userId).map((item) => item.id));
  if (!idsCondominio.has(unidade.condominioId)) return false;
  if (usuarioVeCarteiraGeral(userId)) return true;
  const vigente = cadastros.atribuicoesCobranca.find((item) => item.unidadeId === unidadeId && !item.encerradoEm);
  return Boolean(vigente && vigente.atendenteId === userId);
}

async function assertUnidadeNoEscopo(userId: number, unidadeId: number, condominioId: number) {
  try {
    return await requireUnitInScope(userId, unidadeId, condominioId);
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "UNIT_NOT_FOUND") {
      throw new AtendimentoServiceError("Unidade não encontrada.", 404);
    }
    if (code === "UNIT_CONDO_MISMATCH") {
      throw new AtendimentoServiceError("A unidade não pertence ao condomínio selecionado.", 400);
    }
    if (code === "UNIT_OUT_OF_SCOPE") {
      throw new AtendimentoServiceError("Unidade fora do seu escopo de acesso.", 403);
    }
    if (code === "CONDO_OUT_OF_SCOPE") {
      throw new AtendimentoServiceError("Condomínio fora do seu escopo de acesso.", 403);
    }
    throw error;
  }
}

async function assertCarteiraParaRegistrar(userId: number, unidadeId: number) {
  if (usuarioVeCarteiraGeral(userId)) return;
  const vigente = await openAssignmentForUnit(unidadeId);
  if (!vigente || vigente.atendenteId !== userId) {
    throw new AtendimentoServiceError(
      "Esta cobrança não está na sua carteira. Peça redistribuição à administradora.",
      403,
    );
  }
}

async function validarEntrada(input: AtendimentoInput) {
  if (!Number.isFinite(input.condominioId) || input.condominioId <= 0) {
    throw new AtendimentoServiceError("Selecione o condomínio.", 400);
  }
  if (!Number.isFinite(input.unidadeId) || input.unidadeId <= 0) {
    throw new AtendimentoServiceError("Selecione a unidade.", 400);
  }
  const canal = input.canal.trim();
  if (!canal || !canaisAtendimento.includes(canal as (typeof canaisAtendimento)[number])) {
    throw new AtendimentoServiceError("Canal de atendimento inválido.", 400);
  }
  const respondeu = input.respondeu.trim();
  if (respondeu !== "Sim" && respondeu !== "Não") {
    throw new AtendimentoServiceError("Informe se houve resposta do condômino ou administradora.", 400);
  }
  let motivo = (input.motivo ?? "").trim();
  if (respondeu === "Sim") {
    if (!motivo) {
      throw new AtendimentoServiceError("Selecione o motivo da pendência.", 400);
    }
    if (!motivosPendencia.includes(motivo as (typeof motivosPendencia)[number])) {
      throw new AtendimentoServiceError("Motivo da pendência inválido.", 400);
    }
  } else {
    motivo = "";
  }
  const status = input.status.trim();
  if (!status || !statusAtendimento.includes(status as (typeof statusAtendimento)[number])) {
    throw new AtendimentoServiceError("Situação do atendimento inválida.", 400);
  }

  if (input.responsavelId != null && input.responsavelId > 0) {
    const vinculos = await listUnitLinksByUnit(input.unidadeId);
    const vinculo = vinculos.some((item) => item.responsavelId === input.responsavelId);
    if (!vinculo) {
      throw new AtendimentoServiceError("Responsável não vinculado a esta unidade.", 400);
    }
  }

  return {
    canal,
    respondeu,
    motivo,
    status,
    assunto: (input.assunto ?? "").trim(),
    descricao: (input.descricao ?? "").trim(),
    dataProximaAcao: (input.dataProximaAcao ?? "").trim(),
    proximaAcao: (input.proximaAcao ?? "").trim(),
    responsavelId:
      input.responsavelId != null && input.responsavelId > 0 ? String(input.responsavelId) : "",
  };
}

/** Evita duplicata por clique repetido (mesmo usuário, mesma unidade, payload equivalente). */
const ultimosRegistros = new Map<string, number>();
const JANELA_DEDUPE_MS = 4_000;

function chaveDedupe(userId: number, unidadeId: number, dados: Awaited<ReturnType<typeof validarEntrada>>) {
  return `${userId}:${unidadeId}:${dados.canal}:${dados.respondeu}:${dados.motivo}:${dados.status}:${dados.assunto}:${dados.descricao}`;
}

function assertNaoDuplicadoRecente(userId: number, unidadeId: number, dados: Awaited<ReturnType<typeof validarEntrada>>) {
  const chave = chaveDedupe(userId, unidadeId, dados);
  const agora = Date.now();
  const anterior = ultimosRegistros.get(chave);
  if (anterior != null && agora - anterior < JANELA_DEDUPE_MS) {
    throw new AtendimentoServiceError("Registro já salvo. Aguarde um instante antes de tentar de novo.", 409);
  }
  ultimosRegistros.set(chave, agora);
}

export async function listarAtendimentos(userId: number, filtros?: AtendimentoFiltros): Promise<Atendimento[]> {
  if (filtros?.operacional) {
    const cadastros = await loadFullOperationalCadastros();
    const hoje = hojeIso();
    const intervalo =
      filtros.de && filtros.ate ? { inicio: filtros.de, fim: filtros.ate } : periodoUltimos7Dias(hoje);
    return cadastros.atendimentos
      .filter((item) => atendimentoNaCarteira(cadastros, userId, item))
      .filter((item) => classificarAtendimentoOperacional(item, intervalo, hoje) === filtros.operacional)
      .sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  }

  const idsUnidade = await scopeUnitIds(userId);
  const geral = usuarioVeCarteiraGeral(userId);
  let lista = (await listServiceTickets()).filter((item) => idsUnidade.has(Number(item.unidadeId)));
  if (!geral) {
    lista = lista.filter((item) => item.usuarioId === userId);
  }
  if (filtros?.unidadeId) {
    lista = lista.filter((item) => Number(item.unidadeId) === filtros.unidadeId);
  }
  if (filtros?.status && filtros.status !== "todos") {
    lista = lista.filter((item) => item.status === filtros.status);
  }
  if (filtros?.canal && filtros.canal !== "todos") {
    lista = lista.filter((item) => item.canal === filtros.canal);
  }
  const termo = filtros?.busca?.trim().toLocaleLowerCase("pt-BR");
  if (termo) {
    lista = lista.filter((item) => {
      const texto = `${item.assunto} ${item.descricao} ${item.canal} ${item.motivo}`.toLocaleLowerCase("pt-BR");
      return texto.includes(termo);
    });
  }
  return [...lista].sort((a, b) => b.dataHora.localeCompare(a.dataHora));
}

export async function criarAtendimento(
  userId: number,
  input: AtendimentoInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<Atendimento> {
  const dados = await validarEntrada(input);
  await assertUnidadeNoEscopo(userId, input.unidadeId, input.condominioId);
  await assertCarteiraParaRegistrar(userId, input.unidadeId);
  assertNaoDuplicadoRecente(userId, input.unidadeId, dados);

  const registro: Atendimento = {
    id: crypto.randomUUID(),
    unidadeId: String(input.unidadeId),
    responsavelId: dados.responsavelId,
    usuarioId: userId,
    dataHora: agoraIso(),
    canal: dados.canal,
    respondeu: dados.respondeu,
    motivo: dados.motivo,
    assunto: dados.assunto,
    descricao: dados.descricao,
    status: dados.status,
    dataProximaAcao: dados.dataProximaAcao,
    proximaAcao: dados.proximaAcao,
    retornoConcluidoEm: "",
    retornoConcluidoPorId: null,
  };

  const criado = await createServiceTicket(registro);
  await writeAuditLog({
    entity: "service_ticket",
    recordId: criado.id,
    action: "INSERT",
    previousData: "",
    newData: serializarAtendimentoAuditoria(criado),
    changedFields: "unidade_id, canal, status, respondeu",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  await emitirNotificacaoRetornoAgendado(criado);
  return criado;
}

export async function atualizarAtendimento(
  userId: number,
  id: string,
  input: AtendimentoInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<Atendimento> {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "atendimentos", "editar")) {
    throw new AtendimentoServiceError("Sem permissão para editar atendimentos.", 403);
  }

  const anterior = await findServiceTicketById(id);
  if (!anterior) {
    throw new AtendimentoServiceError("Atendimento não encontrado.", 404);
  }

  const dados = await validarEntrada(input);
  await assertUnidadeNoEscopo(userId, input.unidadeId, input.condominioId);
  if (!usuarioVeCarteiraGeral(userId) && anterior.usuarioId !== userId) {
    throw new AtendimentoServiceError("Só a administradora pode corrigir atendimento de outro colaborador.", 403);
  }

  const atualizado: Atendimento = {
    ...anterior,
    unidadeId: String(input.unidadeId),
    responsavelId: dados.responsavelId,
    canal: dados.canal,
    respondeu: dados.respondeu,
    motivo: dados.motivo,
    assunto: dados.assunto,
    descricao: dados.descricao,
    status: dados.status,
    dataProximaAcao: dados.dataProximaAcao,
    proximaAcao: dados.proximaAcao,
    retornoConcluidoEm: anterior.retornoConcluidoEm ?? "",
    retornoConcluidoPorId: anterior.retornoConcluidoPorId ?? null,
  };

  const salvo = await updateServiceTicket(atualizado);
  await writeAuditLog({
    entity: "service_ticket",
    recordId: id,
    action: "UPDATE",
    previousData: serializarAtendimentoAuditoria(anterior),
    newData: serializarAtendimentoAuditoria(salvo),
    changedFields: "unidade_id, canal, status, descricao, retorno",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  if (
    salvo.dataProximaAcao.trim() &&
    (anterior.dataProximaAcao !== salvo.dataProximaAcao || !anterior.dataProximaAcao.trim())
  ) {
    await emitirNotificacaoRetornoAgendado(salvo);
  }
  return salvo;
}

export async function excluirAtendimento(userId: number, id: string, meta?: { ip?: string; userAgent?: string }) {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "atendimentos", "excluir")) {
    throw new AtendimentoServiceError("Sem permissão para excluir atendimentos.", 403);
  }

  const alvo = await findServiceTicketById(id);
  if (!alvo) {
    throw new AtendimentoServiceError("Atendimento não encontrado.", 404);
  }

  const unidadeId = Number(alvo.unidadeId);
  const idsUnidade = await scopeUnitIds(userId);
  if (!idsUnidade.has(unidadeId)) {
    throw new AtendimentoServiceError("Atendimento fora do seu escopo de acesso.", 403);
  }

  await deleteServiceTicket(id);
  await writeAuditLog({
    entity: "service_ticket",
    recordId: id,
    action: "DELETE",
    previousData: alvo.assunto || alvo.canal,
    newData: "",
    changedFields: "registro",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
}

export async function concluirRetornoAgendado(
  userId: number,
  id: string,
  meta?: { ip?: string; userAgent?: string },
): Promise<Atendimento> {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "atendimentos", "editar")) {
    throw new AtendimentoServiceError("Sem permissão para concluir retornos.", 403);
  }

  const anterior = await findServiceTicketById(id);
  if (!anterior) {
    throw new AtendimentoServiceError("Atendimento não encontrado.", 404);
  }
  if (!anterior.dataProximaAcao.trim()) {
    throw new AtendimentoServiceError("Este atendimento não possui retorno agendado.", 400);
  }
  if (anterior.retornoConcluidoEm?.trim()) {
    throw new AtendimentoServiceError("Retorno já foi marcado como realizado.", 409);
  }

  const unidadeId = Number(anterior.unidadeId);
  const cadastros = await loadCadastrosForScope();
  const unidade = cadastros.unidades.find((item) => item.id === unidadeId);
  if (!unidade) {
    throw new AtendimentoServiceError("Unidade não encontrada.", 404);
  }
  const idsUnidade = await scopeUnitIds(userId);
  if (!idsUnidade.has(unidadeId)) {
    throw new AtendimentoServiceError("Atendimento fora do seu escopo de acesso.", 403);
  }
  await assertCarteiraParaRegistrar(userId, unidadeId);

  const atualizado: Atendimento = {
    ...anterior,
    retornoConcluidoEm: agoraIso(),
    retornoConcluidoPorId: userId,
  };

  const salvo = await updateServiceTicket(atualizado);
  await writeAuditLog({
    entity: "service_ticket",
    recordId: id,
    action: "UPDATE",
    previousData: JSON.stringify({ retornoConcluidoEm: "" }),
    newData: JSON.stringify({
      retornoConcluidoEm: salvo.retornoConcluidoEm,
      retornoConcluidoPorId: salvo.retornoConcluidoPorId,
      dataProximaAcao: salvo.dataProximaAcao,
    }),
    changedFields: "retorno_concluido_em, retorno_concluido_por_id",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return salvo;
}

export function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}
