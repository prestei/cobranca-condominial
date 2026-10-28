import {
  advogadoPrincipalCondominio,
  agoraIso,
  debitoEmAberto,
  escopoCondominios,
  formatarMoeda,
  getCadastros,
  opcoesAdvogadosResponsaveis,
  registrarAuditoria,
  setDocumentosJuridicos,
  setEncaminhamentosJuridicos,
  statusEncaminhamentoJuridico,
  type DocumentoJuridico,
  type EncaminhamentoJuridico,
} from "@/data/catalogo";
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

function idsCondominioNoEscopo(userId: number): Set<number> {
  return new Set(escopoCondominios(getCadastros(), userId).map((item) => item.id));
}

function assertPermissaoJuridico(userId: number, acao: "ler" | "criar" | "editar") {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "juridico", acao)) {
    throw new JuridicoServiceError(`Sem permissão para ${acao === "ler" ? "consultar" : acao} encaminhamentos jurídicos.`, 403);
  }
}

function assertUnidadeNoEscopo(userId: number, unidadeId: number, condominioId: number) {
  const unidade = getCadastros().unidades.find((item) => item.id === unidadeId);
  if (!unidade) {
    throw new JuridicoServiceError("Unidade não encontrada.", 404);
  }
  if (unidade.condominioId !== condominioId) {
    throw new JuridicoServiceError("A unidade não pertence ao condomínio selecionado.", 400);
  }
  if (!idsCondominioNoEscopo(userId).has(condominioId)) {
    throw new JuridicoServiceError("Condomínio fora do seu escopo de acesso.", 403);
  }
  return unidade;
}

function validarAdvogadoResponsavel(condominioId: number, nome: string) {
  const condominio = getCadastros().condominios.find((item) => item.id === condominioId);
  if (!condominio) {
    throw new JuridicoServiceError("Condomínio não encontrado.", 404);
  }
  const permitidos = new Set(opcoesAdvogadosResponsaveis(getCadastros()));
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

function validarDebitos(unidadeId: number, debitoIds: number[] | undefined) {
  if (!debitoIds || debitoIds.length === 0) return [] as number[];
  const idsUnicos = [...new Set(debitoIds.filter((id) => Number.isFinite(id) && id > 0))];
  const cadastros = getCadastros();
  for (const id of idsUnicos) {
    const debito = cadastros.debitos.find((item) => item.id === id);
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

function encaminhamentoNoEscopo(userId: number, item: EncaminhamentoJuridico) {
  return idsCondominioNoEscopo(userId).has(item.condominioId);
}

function incluirDocumentos(userId: number, encaminhamento: EncaminhamentoJuridico): EncaminhamentoJuridicoDetalhe {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "juridico", "ler")) {
    return encaminhamento;
  }
  const documentos = getCadastros().documentosJuridicos.filter((item) => item.encaminhamentoId === encaminhamento.id);
  return { ...encaminhamento, documentos: [...documentos].sort((a, b) => b.registradoEm.localeCompare(a.registradoEm)) };
}

export function listarEncaminhamentosJuridicos(
  userId: number,
  filtros?: EncaminhamentoJuridicoFiltros,
): EncaminhamentoJuridicoDetalhe[] {
  assertPermissaoJuridico(userId, "ler");
  const idsCondominio = idsCondominioNoEscopo(userId);
  let lista = getCadastros().encaminhamentosJuridicos.filter((item) => idsCondominio.has(item.condominioId));

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

  return [...lista]
    .sort((a, b) => b.encaminhadoEm.localeCompare(a.encaminhadoEm))
    .map((item) => incluirDocumentos(userId, item));
}

export function obterEncaminhamentoJuridico(userId: number, id: string): EncaminhamentoJuridicoDetalhe {
  assertPermissaoJuridico(userId, "ler");
  const encaminhamento = getCadastros().encaminhamentosJuridicos.find((item) => item.id === id);
  if (!encaminhamento) {
    throw new JuridicoServiceError("Encaminhamento não encontrado.", 404);
  }
  if (!encaminhamentoNoEscopo(userId, encaminhamento)) {
    throw new JuridicoServiceError("Encaminhamento fora do seu escopo de acesso.", 403);
  }
  return incluirDocumentos(userId, encaminhamento);
}

function montarResumoContexto(unidadeId: number, debitoIds: number[], textoExtra: string) {
  const cadastros = getCadastros();
  const debitos =
    debitoIds.length > 0
      ? cadastros.debitos.filter((item) => debitoIds.includes(item.id))
      : cadastros.debitos.filter((item) => item.unidadeId === unidadeId && debitoEmAberto(item));
  const valor = debitos.reduce((sum, item) => sum + Number(item.valorAtualizado || 0), 0);
  const partes = [
    `${debitos.length} débito(s) em aberto`,
    valor > 0 ? `Total atualizado: ${formatarMoeda(String(valor))}` : "",
    textoExtra.trim(),
  ].filter(Boolean);
  return partes.join(" · ");
}

export function criarEncaminhamentoJuridico(
  userId: number,
  input: EncaminhamentoJuridicoInput,
  meta?: { ip?: string; userAgent?: string },
): EncaminhamentoJuridico {
  assertPermissaoJuridico(userId, "criar");
  if (!Number.isFinite(input.condominioId) || input.condominioId <= 0) {
    throw new JuridicoServiceError("Selecione o condomínio.", 400);
  }
  if (!Number.isFinite(input.unidadeId) || input.unidadeId <= 0) {
    throw new JuridicoServiceError("Selecione a unidade.", 400);
  }
  assertUnidadeNoEscopo(userId, input.unidadeId, input.condominioId);

  const debitoIds = validarDebitos(input.unidadeId, input.debitoIds);
  const condominio = getCadastros().condominios.find((item) => item.id === input.condominioId);
  const advogadoDefault = condominio ? advogadoPrincipalCondominio(condominio) : "";
  const advogadoResponsavel = validarAdvogadoResponsavel(
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
    resumoContexto: montarResumoContexto(input.unidadeId, debitoIds, input.resumoContexto ?? ""),
    atualizadoEm: agora,
    atualizadoPorId: userId,
  };

  setEncaminhamentosJuridicos((current) => [...current, registro]);
  registrarAuditoria(
    {
      entidade: "legal_case_referral",
      registroId: registro.id,
      acao: "INSERT",
      dadosAnteriores: "",
      dadosNovos: JSON.stringify({
        unidadeId: registro.unidadeId,
        status: registro.status,
        advogadoResponsavel: registro.advogadoResponsavel,
        debitoIds: registro.debitoIds,
      }),
      camposAlterados: "unidade_id, status, advogado_responsavel, debito_ids",
    },
    userId,
    meta,
  );
  return registro;
}

export function atualizarEncaminhamentoJuridico(
  userId: number,
  id: string,
  input: EncaminhamentoJuridicoAtualizacaoInput,
  meta?: { ip?: string; userAgent?: string },
): EncaminhamentoJuridico {
  assertPermissaoJuridico(userId, "editar");
  const anterior = getCadastros().encaminhamentosJuridicos.find((item) => item.id === id);
  if (!anterior) {
    throw new JuridicoServiceError("Encaminhamento não encontrado.", 404);
  }
  if (!encaminhamentoNoEscopo(userId, anterior)) {
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
    advogadoResponsavel = validarAdvogadoResponsavel(anterior.condominioId, input.advogadoResponsavel);
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

  setEncaminhamentosJuridicos((current) => current.map((item) => (item.id === id ? atualizado : item)));

  const campos: string[] = [];
  if (status !== anterior.status) campos.push("status");
  if (advogadoResponsavel !== anterior.advogadoResponsavel) campos.push("advogado_responsavel");
  if (observacoes !== anterior.observacoes) campos.push("observacoes");

  if (campos.length > 0) {
    registrarAuditoria(
      {
        entidade: "legal_case_referral",
        registroId: id,
        acao: "UPDATE",
        dadosAnteriores: JSON.stringify({
          status: anterior.status,
          advogadoResponsavel: anterior.advogadoResponsavel,
          observacoes: anterior.observacoes,
        }),
        dadosNovos: JSON.stringify({
          status: atualizado.status,
          advogadoResponsavel: atualizado.advogadoResponsavel,
          observacoes: atualizado.observacoes,
        }),
        camposAlterados: campos.join(", "),
      },
      userId,
      meta,
    );
  }

  return atualizado;
}

export function registrarDocumentoJuridico(
  userId: number,
  encaminhamentoId: string,
  input: DocumentoJuridicoInput,
  meta?: { ip?: string; userAgent?: string },
): DocumentoJuridico {
  assertPermissaoJuridico(userId, "editar");
  const encaminhamento = getCadastros().encaminhamentosJuridicos.find((item) => item.id === encaminhamentoId);
  if (!encaminhamento) {
    throw new JuridicoServiceError("Encaminhamento não encontrado.", 404);
  }
  if (!encaminhamentoNoEscopo(userId, encaminhamento)) {
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

  setDocumentosJuridicos((current) => [...current, registro]);
  registrarAuditoria(
    {
      entidade: "legal_document",
      registroId: registro.id,
      acao: "INSERT",
      dadosAnteriores: "",
      dadosNovos: JSON.stringify({
        encaminhamentoId,
        titulo: registro.titulo,
        referenciaArquivo: registro.referenciaArquivo,
      }),
      camposAlterados: "encaminhamento_id, titulo, referencia_arquivo",
    },
    userId,
    meta,
  );
  return registro;
}

export function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}
