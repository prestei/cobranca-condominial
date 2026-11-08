import {
  agoraIso,
  debitoEmAberto,
  escopoCondominios,
  formatarData,
  getCadastros,
  proximoNumero,
  registrarAuditoria,
  setResponsaveis,
  setUnidades,
  setVinculos,
  SITUACAO_COBRANCA_PADRAO,
  situacaoCobrancaUnidade,
  situacoesUnidade,
  statusUnidade,
  tiposUnidade,
  tiposVinculo,
  type Responsavel,
  type Unidade,
  type Vinculo,
} from "@/data/catalogo";
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

function idsCondominioNoEscopo(userId: number): Set<number> {
  const cadastros = getCadastros();
  return new Set(escopoCondominios(cadastros, userId).map((item) => item.id));
}

function assertCondominioNoEscopo(userId: number, condominioId: number) {
  const ids = idsCondominioNoEscopo(userId);
  if (!ids.has(condominioId)) {
    throw new UnidadeServiceError("Condomínio fora do seu escopo de acesso.", 403);
  }
}

function assertCondominioValido(condominioId: number) {
  const condominio = getCadastros().condominios.find((item) => item.id === condominioId);
  if (!condominio) {
    throw new UnidadeServiceError("Condomínio inválido.", 400);
  }
  return condominio;
}

function normalizarIdentificacao(identificacao: string) {
  return identificacao.trim();
}

function validarEntrada(input: UnidadeInput, editingId: number | null) {
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

  const duplicada = getCadastros().unidades.some(
    (item) =>
      item.id !== editingId &&
      item.condominioId === input.condominioId &&
      item.identificacao.localeCompare(identificacao, "pt-BR", { sensitivity: "base" }) === 0,
  );
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

function unidadeNoEscopo(userId: number, unidade: Unidade) {
  assertCondominioNoEscopo(userId, unidade.condominioId);
}

export function listarUnidades(userId: number): Unidade[] {
  const ids = idsCondominioNoEscopo(userId);
  return getCadastros().unidades.filter((item) => ids.has(item.condominioId));
}

export function obterUnidadeDetalhe(userId: number, unidadeId: number) {
  const unidade = getCadastros().unidades.find((item) => item.id === unidadeId);
  if (!unidade) {
    throw new UnidadeServiceError("Unidade não encontrada.", 404);
  }
  unidadeNoEscopo(userId, unidade);

  const perm = permissoesDoUsuarioId(userId);
  const cadastros = getCadastros();
  const vinculos = cadastros.vinculos
    .filter((item) => item.unidadeId === unidadeId)
    .map((vinculo) => {
      const responsavel = cadastros.responsaveis.find((item) => item.id === vinculo.responsavelId);
      return {
        ...vinculo,
        responsavel: responsavel ? responsavelParaResposta(responsavel, perm) : null,
      };
    });

  const debitos = cadastros.debitos.filter((item) => item.unidadeId === unidadeId);
  const atendimentos = cadastros.atendimentos.filter((item) => String(item.unidadeId) === String(unidadeId));
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

export function criarUnidade(userId: number, input: UnidadeInput, meta?: { ip?: string; userAgent?: string }) {
  assertCondominioValido(input.condominioId);
  assertCondominioNoEscopo(userId, input.condominioId);
  const dados = validarEntrada(input, null);
  const nextId = proximoNumero(getCadastros().unidades.map((item) => item.id));
  const unidade: Unidade = { id: nextId, ...dados };
  setUnidades((current) => [...current, unidade]);
  registrarAuditoria(
    {
      entidade: "unit",
      registroId: String(nextId),
      acao: "INSERT",
      dadosAnteriores: "",
      dadosNovos: JSON.stringify(unidade),
      camposAlterados: "condominio_id, identificacao, bloco, tipo, status, situacao",
    },
    userId,
    meta,
  );
  return unidade;
}

export function atualizarUnidade(
  userId: number,
  unidadeId: number,
  input: UnidadeInput,
  meta?: { ip?: string; userAgent?: string },
) {
  const atual = getCadastros().unidades.find((item) => item.id === unidadeId);
  if (!atual) {
    throw new UnidadeServiceError("Unidade não encontrada.", 404);
  }
  unidadeNoEscopo(userId, atual);
  assertCondominioValido(input.condominioId);
  assertCondominioNoEscopo(userId, input.condominioId);
  const dados = validarEntrada(input, unidadeId);
  const atualizada: Unidade = { id: unidadeId, ...dados };
  setUnidades((current) => current.map((item) => (item.id === unidadeId ? atualizada : item)));
  registrarAuditoria(
    {
      entidade: "unit",
      registroId: String(unidadeId),
      acao: "UPDATE",
      dadosAnteriores: JSON.stringify(atual),
      dadosNovos: JSON.stringify(atualizada),
      camposAlterados: "condominio_id, identificacao, bloco, tipo, status, situacao",
    },
    userId,
    meta,
  );
  return atualizada;
}

export function excluirUnidade(userId: number, unidadeId: number, meta?: { ip?: string; userAgent?: string }) {
  const alvo = getCadastros().unidades.find((item) => item.id === unidadeId);
  if (!alvo) {
    throw new UnidadeServiceError("Unidade não encontrada.", 404);
  }
  unidadeNoEscopo(userId, alvo);
  const cadastros = getCadastros();
  const emUso =
    cadastros.vinculos.some((item) => item.unidadeId === unidadeId) ||
    cadastros.debitos.some((item) => item.unidadeId === unidadeId) ||
    cadastros.atendimentos.some((item) => item.unidadeId === String(unidadeId));
  if (emUso) {
    throw new UnidadeServiceError(
      "Unidade com vínculos ou histórico. Inative a unidade em vez de excluir.",
      409,
    );
  }
  setUnidades((current) => current.filter((item) => item.id !== unidadeId));
  registrarAuditoria(
    {
      entidade: "unit",
      registroId: String(unidadeId),
      acao: "DELETE",
      dadosAnteriores: JSON.stringify(alvo),
      dadosNovos: "",
      camposAlterados: "identificacao",
    },
    userId,
    meta,
  );
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

export function vincularResponsavel(userId: number, unidadeId: number, input: VinculoInput, meta?: { ip?: string; userAgent?: string }) {
  const unidade = getCadastros().unidades.find((item) => item.id === unidadeId);
  if (!unidade) {
    throw new UnidadeServiceError("Unidade não encontrada.", 404);
  }
  unidadeNoEscopo(userId, unidade);

  if (!tiposVinculo.includes(input.tipoVinculo as (typeof tiposVinculo)[number])) {
    throw new UnidadeServiceError("Tipo de vínculo inválido.", 400);
  }

  let responsavelId = input.responsavelId;
  if (input.responsavel) {
    const cpf = normalizarCpfCnpj(input.responsavel.cpfCnpj);
    if (!input.responsavel.nome.trim() || !cpf) {
      throw new UnidadeServiceError("Informe nome e CPF/CNPJ do responsável.", 400);
    }
    const existente = getCadastros().responsaveis.find((item) => normalizarCpfCnpj(item.cpfCnpj) === cpf);
    if (existente) {
      responsavelId = existente.id;
    } else {
      const nextId = proximoNumero(getCadastros().responsaveis.map((item) => item.id));
      const novo: Responsavel = { id: nextId, ...input.responsavel, cpfCnpj: input.responsavel.cpfCnpj.trim() };
      setResponsaveis((current) => [...current, novo]);
      responsavelId = nextId;
      registrarAuditoria(
        {
          entidade: "responsible_party",
          registroId: String(nextId),
          acao: "INSERT",
          dadosAnteriores: "",
          dadosNovos: JSON.stringify({ id: nextId, nome: novo.nome }),
          camposAlterados: "nome, cpf_cnpj, tipo_pessoa",
        },
        userId,
        meta,
      );
    }
  }

  if (!responsavelId) {
    throw new UnidadeServiceError("Selecione ou cadastre um responsável.", 400);
  }

  const responsavel = getCadastros().responsaveis.find((item) => item.id === responsavelId);
  if (!responsavel) {
    throw new UnidadeServiceError("Responsável inválido.", 400);
  }

  const principal = input.principal ?? false;
  if (principal) {
    setVinculos((current) =>
      current.map((item) => (item.unidadeId === unidadeId ? { ...item, principal: false } : item)),
    );
  }

  const duplicado = getCadastros().vinculos.some(
    (item) => item.unidadeId === unidadeId && item.responsavelId === responsavelId && item.tipoVinculo === input.tipoVinculo,
  );
  if (duplicado) {
    throw new UnidadeServiceError("Este vínculo já existe para a unidade.", 409);
  }

  const vinculoId = proximoNumero(getCadastros().vinculos.map((item) => item.id));
  const vinculo: Vinculo = {
    id: vinculoId,
    unidadeId,
    responsavelId,
    tipoVinculo: input.tipoVinculo,
    principal,
    observacoes: (input.observacoes ?? "").trim(),
  };
  setVinculos((current) => [...current, vinculo]);
  registrarAuditoria(
    {
      entidade: "unit_responsible_party",
      registroId: String(vinculoId),
      acao: "INSERT",
      dadosAnteriores: "",
      dadosNovos: JSON.stringify(vinculo),
      camposAlterados: "unidade_id, responsavel_id, tipo_vinculo, principal",
    },
    userId,
    meta,
  );
  return vinculo;
}

export function removerVinculo(userId: number, unidadeId: number, vinculoId: number, meta?: { ip?: string; userAgent?: string }) {
  const unidade = getCadastros().unidades.find((item) => item.id === unidadeId);
  if (!unidade) {
    throw new UnidadeServiceError("Unidade não encontrada.", 404);
  }
  unidadeNoEscopo(userId, unidade);
  const vinculo = getCadastros().vinculos.find((item) => item.id === vinculoId && item.unidadeId === unidadeId);
  if (!vinculo) {
    throw new UnidadeServiceError("Vínculo não encontrado.", 404);
  }
  setVinculos((current) => current.filter((item) => item.id !== vinculoId));
  registrarAuditoria(
    {
      entidade: "unit_responsible_party",
      registroId: String(vinculoId),
      acao: "DELETE",
      dadosAnteriores: JSON.stringify(vinculo),
      dadosNovos: "",
      camposAlterados: "tipo_vinculo, responsavel_id",
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

export { formatarData };
