import {
  agoraIso,
  escopoCondominios,
  escopoUnidades,
  getCadastros,
  registrarAuditoria,
  setPropostasNegociacao,
  statusPropostaNegociacao,
  type PropostaNegociacao,
} from "@/data/catalogo";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

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
};

export type PropostaNegociacaoStatusInput = {
  status: string;
  termosAprovados?: string;
};

export type PropostaNegociacaoFiltros = {
  unidadeId?: number;
  status?: string;
};

function usuarioVeCarteiraGeral(userId: number) {
  const perm = permissoesDoUsuarioId(userId);
  return temPermissao(perm, "usuarios", "criar");
}

function idsCondominioNoEscopo(userId: number): Set<number> {
  return new Set(escopoCondominios(getCadastros(), userId).map((item) => item.id));
}

function idsUnidadeNoEscopo(userId: number): Set<number> {
  return new Set(escopoUnidades(getCadastros(), userId).map((item) => item.id));
}

function atribuicaoVigente(unidadeId: number) {
  return getCadastros().atribuicoesCobranca.find((item) => item.unidadeId === unidadeId && !item.encerradoEm);
}

function assertUnidadeNoEscopo(userId: number, unidadeId: number, condominioId: number) {
  const unidade = getCadastros().unidades.find((item) => item.id === unidadeId);
  if (!unidade) {
    throw new PropostaNegociacaoServiceError("Unidade não encontrada.", 404);
  }
  if (unidade.condominioId !== condominioId) {
    throw new PropostaNegociacaoServiceError("A unidade não pertence ao condomínio selecionado.", 400);
  }
  if (!idsUnidadeNoEscopo(userId).has(unidadeId)) {
    throw new PropostaNegociacaoServiceError("Unidade fora do seu escopo de acesso.", 403);
  }
  if (!idsCondominioNoEscopo(userId).has(condominioId)) {
    throw new PropostaNegociacaoServiceError("Condomínio fora do seu escopo de acesso.", 403);
  }
  return unidade;
}

function assertCarteiraParaRegistrar(userId: number, unidadeId: number) {
  if (usuarioVeCarteiraGeral(userId)) return;
  const vigente = atribuicaoVigente(unidadeId);
  if (!vigente || vigente.atendenteId !== userId) {
    throw new PropostaNegociacaoServiceError(
      "Esta cobrança não está na sua carteira. Peça redistribuição à administradora.",
      403,
    );
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

function validarDebitos(unidadeId: number, debitoIds: number[]) {
  if (!Array.isArray(debitoIds) || debitoIds.length === 0) {
    throw new PropostaNegociacaoServiceError("Selecione ao menos um débito vinculado à proposta.", 400);
  }
  const idsUnicos = [...new Set(debitoIds.filter((id) => Number.isFinite(id) && id > 0))];
  if (idsUnicos.length === 0) {
    throw new PropostaNegociacaoServiceError("Débitos inválidos.", 400);
  }
  const cadastros = getCadastros();
  for (const id of idsUnicos) {
    const debito = cadastros.debitos.find((item) => item.id === id);
    if (!debito) {
      throw new PropostaNegociacaoServiceError(`Débito ${id} não encontrado.`, 400);
    }
    if (debito.unidadeId !== unidadeId) {
      throw new PropostaNegociacaoServiceError("Todos os débitos devem pertencer à mesma unidade.", 400);
    }
  }
  return idsUnicos;
}

function validarEntrada(input: PropostaNegociacaoInput) {
  if (!Number.isFinite(input.condominioId) || input.condominioId <= 0) {
    throw new PropostaNegociacaoServiceError("Selecione o condomínio.", 400);
  }
  if (!Number.isFinite(input.unidadeId) || input.unidadeId <= 0) {
    throw new PropostaNegociacaoServiceError("Selecione a unidade.", 400);
  }
  const valorProposto = normalizarValorMonetario(input.valorProposto);
  const debitoIds = validarDebitos(input.unidadeId, input.debitoIds);
  return {
    valorProposto,
    observacoes: (input.observacoes ?? "").trim(),
    debitoIds,
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

export function listarPropostasNegociacao(userId: number, filtros?: PropostaNegociacaoFiltros): PropostaNegociacao[] {
  const idsUnidade = idsUnidadeNoEscopo(userId);
  let lista = getCadastros().propostasNegociacao.filter((item) => idsUnidade.has(item.unidadeId));
  if (!usuarioVeCarteiraGeral(userId)) {
    lista = lista.filter((item) => item.usuarioId === userId);
  }
  if (filtros?.unidadeId) {
    lista = lista.filter((item) => item.unidadeId === filtros.unidadeId);
  }
  if (filtros?.status && filtros.status !== "todos") {
    lista = lista.filter((item) => item.status === filtros.status);
  }
  return [...lista].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
}

export function obterPropostaNegociacao(userId: number, id: string): PropostaNegociacao {
  const proposta = getCadastros().propostasNegociacao.find((item) => item.id === id);
  if (!proposta) {
    throw new PropostaNegociacaoServiceError("Proposta não encontrada.", 404);
  }
  if (!idsUnidadeNoEscopo(userId).has(proposta.unidadeId)) {
    throw new PropostaNegociacaoServiceError("Proposta fora do seu escopo de acesso.", 403);
  }
  if (!usuarioVeCarteiraGeral(userId) && proposta.usuarioId !== userId) {
    throw new PropostaNegociacaoServiceError("Proposta fora da sua carteira.", 403);
  }
  return proposta;
}

export function criarPropostaNegociacao(
  userId: number,
  input: PropostaNegociacaoInput,
  meta?: { ip?: string; userAgent?: string },
): PropostaNegociacao {
  const dados = validarEntrada(input);
  assertUnidadeNoEscopo(userId, input.unidadeId, input.condominioId);
  assertCarteiraParaRegistrar(userId, input.unidadeId);

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
  };

  setPropostasNegociacao((current) => [...current, registro]);
  registrarAuditoria(
    {
      entidade: "negotiation_proposal",
      registroId: registro.id,
      acao: "INSERT",
      dadosAnteriores: "",
      dadosNovos: JSON.stringify({
        unidadeId: registro.unidadeId,
        valorProposto: registro.valorProposto,
        status: registro.status,
        debitoIds: registro.debitoIds,
      }),
      camposAlterados: "unidade_id, valor_proposto, status, debito_ids",
    },
    userId,
    meta,
  );
  return registro;
}

export function atualizarStatusPropostaNegociacao(
  userId: number,
  id: string,
  input: PropostaNegociacaoStatusInput,
  meta?: { ip?: string; userAgent?: string },
): PropostaNegociacao {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "atendimentos", "editar")) {
    throw new PropostaNegociacaoServiceError("Sem permissão para alterar o status da proposta.", 403);
  }

  const anterior = getCadastros().propostasNegociacao.find((item) => item.id === id);
  if (!anterior) {
    throw new PropostaNegociacaoServiceError("Proposta não encontrada.", 404);
  }
  assertUnidadeNoEscopo(userId, anterior.unidadeId, anterior.condominioId);

  const status = input.status.trim();
  if (!statusPropostaNegociacao.includes(status as (typeof statusPropostaNegociacao)[number])) {
    throw new PropostaNegociacaoServiceError("Status da proposta inválido.", 400);
  }
  validarTransicaoStatus(anterior.status, status);

  let termosAprovados = anterior.termosAprovados;
  let acordoConfirmadoEm = anterior.acordoConfirmadoEm;
  let acordoConfirmadoPorId = anterior.acordoConfirmadoPorId;

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
  }

  const atualizado: PropostaNegociacao = {
    ...anterior,
    status,
    termosAprovados,
    acordoConfirmadoEm,
    acordoConfirmadoPorId,
  };

  setPropostasNegociacao((current) => current.map((item) => (item.id === id ? atualizado : item)));
  registrarAuditoria(
    {
      entidade: "negotiation_proposal",
      registroId: id,
      acao: "UPDATE",
      dadosAnteriores: JSON.stringify({ status: anterior.status }),
      dadosNovos: JSON.stringify({
        status: atualizado.status,
        termosAprovados: atualizado.termosAprovados,
        acordoConfirmadoEm: atualizado.acordoConfirmadoEm,
      }),
      camposAlterados: "status, termos_aprovados, acordo_confirmado_em",
    },
    userId,
    meta,
  );
  return atualizado;
}

export function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}
