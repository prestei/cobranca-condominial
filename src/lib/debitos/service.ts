import {
  agoraIso,
  debitoEmAberto,
  escopoCondominios,
  escopoUnidades,
  getCadastros,
  origensDebito,
  proximoNumero,
  registrarAuditoria,
  setDebitos,
  setUnidades,
  statusDebito,
  type Debito,
  type FonteValoresDebito,
} from "@/data/catalogo";
import {
  calcularIndicadoresInadimplencia,
  type DebitoIndicadores,
  type DebitoIndicadoresInput,
} from "@/lib/debitos/indicadores";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

export class DebitoServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detalhes?: string[],
  ) {
    super(message);
  }
}

export type DebitoInput = {
  condominioId: number;
  unidadeId: number;
  referencia: string;
  descricao?: string;
  dataVencimento: string;
  valor?: string;
  valorOriginal?: string;
  multa?: string;
  juros?: string;
  correcao?: string;
  valorAtualizado?: string;
  status: string;
  dataPagamento?: string;
  valorPago?: string;
  origem?: string;
  identificadorExterno?: string;
};

export type DebitoFiltros = {
  condominioId?: number;
  unidadeId?: number;
  status?: string;
  origem?: string;
  busca?: string;
  vencimentoDe?: string;
  vencimentoAte?: string;
};

const DINHEIRO = /^\d+([.,]\d{1,2})?$/;

function idsCondominioNoEscopo(userId: number): Set<number> {
  return new Set(escopoCondominios(getCadastros(), userId).map((item) => item.id));
}

function idsUnidadeNoEscopo(userId: number): Set<number> {
  return new Set(escopoUnidades(getCadastros(), userId).map((item) => item.id));
}

function assertDebitoNoEscopo(userId: number, debito: Pick<Debito, "condominioId" | "unidadeId">) {
  if (!idsCondominioNoEscopo(userId).has(debito.condominioId)) {
    throw new DebitoServiceError("Condomínio fora do seu escopo de acesso.", 403);
  }
  if (!idsUnidadeNoEscopo(userId).has(debito.unidadeId)) {
    throw new DebitoServiceError("Unidade fora do seu escopo de acesso.", 403);
  }
}

function assertUnidadeDoCondominio(condominioId: number, unidadeId: number) {
  const unidade = getCadastros().unidades.find((item) => item.id === unidadeId);
  if (!unidade) {
    throw new DebitoServiceError("Unidade não encontrada.", 404);
  }
  if (unidade.condominioId !== condominioId) {
    throw new DebitoServiceError("A unidade não pertence ao condomínio selecionado.", 400);
  }
  return unidade;
}

function canonMoeda(value: string | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  return raw.replace(",", ".");
}

function validarMoedaOpcional(campo: string, valor: string | undefined, erros: Record<string, string>) {
  const raw = (valor ?? "").trim();
  if (raw && !DINHEIRO.test(raw)) {
    erros[campo] = "Informe um valor com até duas casas.";
  }
}

function validarEntrada(input: DebitoInput): Omit<Debito, "id" | "atualizadoEm" | "fonteValores"> {
  const referencia = input.referencia.trim();
  const erros: Record<string, string> = {};
  if (!Number.isFinite(input.condominioId) || input.condominioId <= 0) {
    throw new DebitoServiceError("Selecione o condomínio.", 400);
  }
  if (!Number.isFinite(input.unidadeId) || input.unidadeId <= 0) {
    throw new DebitoServiceError("Selecione a unidade.", 400);
  }
  assertUnidadeDoCondominio(input.condominioId, input.unidadeId);
  if (!referencia) {
    throw new DebitoServiceError("Informe a referência. Ex.: 09/2026.", 400);
  }
  if (!input.dataVencimento.trim()) {
    throw new DebitoServiceError("Informe o vencimento.", 400);
  }
  const status = input.status.trim();
  if (!status || !statusDebito.includes(status as (typeof statusDebito)[number])) {
    throw new DebitoServiceError("Situação do débito inválida.", 400);
  }

  validarMoedaOpcional("valor", input.valor, erros);
  validarMoedaOpcional("valorOriginal", input.valorOriginal, erros);
  validarMoedaOpcional("multa", input.multa, erros);
  validarMoedaOpcional("juros", input.juros, erros);
  validarMoedaOpcional("correcao", input.correcao, erros);
  validarMoedaOpcional("valorAtualizado", input.valorAtualizado, erros);
  validarMoedaOpcional("valorPago", input.valorPago, erros);
  if (Object.keys(erros).length > 0) {
    throw new DebitoServiceError("Valores monetários inválidos.", 400, Object.values(erros));
  }

  const origem = (input.origem ?? "").trim();
  if (origem && !origensDebito.includes(origem as (typeof origensDebito)[number])) {
    throw new DebitoServiceError("Origem dos dados inválida.", 400);
  }

  return {
    condominioId: input.condominioId,
    unidadeId: input.unidadeId,
    referencia,
    descricao: (input.descricao ?? "").trim(),
    dataVencimento: input.dataVencimento.trim(),
    valor: canonMoeda(input.valor),
    valorOriginal: canonMoeda(input.valorOriginal),
    multa: canonMoeda(input.multa),
    juros: canonMoeda(input.juros),
    correcao: canonMoeda(input.correcao),
    valorAtualizado: canonMoeda(input.valorAtualizado),
    status,
    dataPagamento: (input.dataPagamento ?? "").trim(),
    valorPago: canonMoeda(input.valorPago),
    origem,
    identificadorExterno: (input.identificadorExterno ?? "").trim(),
  };
}

function serializarDebitoAuditoria(debito: Debito) {
  return JSON.stringify({
    referencia: debito.referencia,
    status: debito.status,
    valorAtualizado: debito.valorAtualizado,
    origem: debito.origem,
    fonteValores: debito.fonteValores,
    atualizadoEm: debito.atualizadoEm,
  });
}

export function listarDebitos(userId: number, filtros?: DebitoFiltros): Debito[] {
  const idsCondominio = idsCondominioNoEscopo(userId);
  let lista = getCadastros().debitos.filter((item) => idsCondominio.has(item.condominioId));

  if (filtros?.condominioId) {
    lista = lista.filter((item) => item.condominioId === filtros.condominioId);
  }
  if (filtros?.unidadeId) {
    lista = lista.filter((item) => item.unidadeId === filtros.unidadeId);
  }
  if (filtros?.status && filtros.status !== "todos") {
    lista = lista.filter((item) => item.status === filtros.status);
  }
  if (filtros?.origem && filtros.origem !== "todas") {
    lista = lista.filter((item) => item.origem === filtros.origem);
  }
  if (filtros?.vencimentoDe) {
    lista = lista.filter((item) => item.dataVencimento >= filtros.vencimentoDe!);
  }
  if (filtros?.vencimentoAte) {
    lista = lista.filter((item) => item.dataVencimento <= filtros.vencimentoAte!);
  }
  const termo = filtros?.busca?.trim().toLocaleLowerCase("pt-BR");
  if (termo) {
    lista = lista.filter((item) => {
      const texto = `${item.referencia} ${item.descricao} ${item.identificadorExterno} ${item.origem}`.toLocaleLowerCase(
        "pt-BR",
      );
      return texto.includes(termo);
    });
  }

  return [...lista].sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento) || a.id - b.id);
}

export function obterDebito(userId: number, debitoId: number): Debito {
  const debito = getCadastros().debitos.find((item) => item.id === debitoId);
  if (!debito) {
    throw new DebitoServiceError("Débito não encontrado.", 404);
  }
  assertDebitoNoEscopo(userId, debito);
  return debito;
}

export function obterIndicadoresDebitos(
  userId: number,
  input: Omit<DebitoIndicadoresInput, "debitos"> & { filtros?: DebitoFiltros },
): DebitoIndicadores {
  const debitos = listarDebitos(userId, input.filtros);
  return calcularIndicadoresInadimplencia({
    debitos,
    dataBase: input.dataBase,
    limiteDias: input.limiteDias,
    unidadesCarteira: input.unidadesCarteira,
  });
}

export function criarDebito(
  userId: number,
  input: DebitoInput,
  meta?: { ip?: string; userAgent?: string },
): Debito {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "debitos", "criar")) {
    throw new DebitoServiceError("Sem permissão para cadastrar débitos.", 403);
  }

  const dados = validarEntrada(input);
  assertDebitoNoEscopo(userId, dados);

  const id = proximoNumero(getCadastros().debitos.map((item) => item.id));
  const fonteValores: FonteValoresDebito = "manual";
  const registro: Debito = {
    id,
    ...dados,
    fonteValores,
    atualizadoEm: agoraIso(),
  };

  setDebitos((current) => [...current, registro]);
  registrarAuditoria(
    {
      entidade: "debt",
      registroId: String(id),
      acao: "INSERT",
      dadosAnteriores: "",
      dadosNovos: serializarDebitoAuditoria(registro),
      camposAlterados: "referencia, status, valor_atualizado, origem, fonte_valores",
    },
    userId,
    meta,
  );
  return registro;
}

export function atualizarDebito(
  userId: number,
  id: number,
  input: DebitoInput,
  meta?: { ip?: string; userAgent?: string },
): Debito {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "debitos", "editar")) {
    throw new DebitoServiceError("Sem permissão para editar débitos.", 403);
  }

  const anterior = getCadastros().debitos.find((item) => item.id === id);
  if (!anterior) {
    throw new DebitoServiceError("Débito não encontrado.", 404);
  }
  assertDebitoNoEscopo(userId, anterior);

  const dados = validarEntrada(input);
  assertDebitoNoEscopo(userId, dados);

  const fonteValores: FonteValoresDebito = "manual";

  const atualizado: Debito = {
    ...anterior,
    ...dados,
    id,
    fonteValores,
    atualizadoEm: agoraIso(),
  };

  setDebitos((current) => current.map((item) => (item.id === id ? atualizado : item)));
  registrarAuditoria(
    {
      entidade: "debt",
      registroId: String(id),
      acao: "UPDATE",
      dadosAnteriores: serializarDebitoAuditoria(anterior),
      dadosNovos: serializarDebitoAuditoria(atualizado),
      camposAlterados: "referencia, status, valores, origem, fonte_valores, atualizado_em",
    },
    userId,
    meta,
  );
  return atualizado;
}

export function excluirDebito(userId: number, id: number, meta?: { ip?: string; userAgent?: string }) {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "debitos", "excluir")) {
    throw new DebitoServiceError("Sem permissão para excluir débitos.", 403);
  }

  const alvo = getCadastros().debitos.find((item) => item.id === id);
  if (!alvo) {
    throw new DebitoServiceError("Débito não encontrado.", 404);
  }
  assertDebitoNoEscopo(userId, alvo);

  setDebitos((current) => current.filter((item) => item.id !== id));
  registrarAuditoria(
    {
      entidade: "debt",
      registroId: String(id),
      acao: "DELETE",
      dadosAnteriores: serializarDebitoAuditoria(alvo),
      dadosNovos: "",
      camposAlterados: "registro",
    },
    userId,
    meta,
  );
}

/** Marca a unidade como quitada (fora da cobrança ativa). Atendimentos e débitos históricos permanecem. */
export function confirmarQuitacaoUnidade(
  userId: number,
  unidadeId: number,
  opcoes?: { forcar?: boolean },
  meta?: { ip?: string; userAgent?: string },
) {
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "debitos", "editar") && !temPermissao(perm, "unidades", "editar")) {
    throw new DebitoServiceError("Sem permissão para confirmar quitação.", 403);
  }

  const unidade = getCadastros().unidades.find((item) => item.id === unidadeId);
  if (!unidade) {
    throw new DebitoServiceError("Unidade não encontrada.", 404);
  }
  if (!idsUnidadeNoEscopo(userId).has(unidadeId)) {
    throw new DebitoServiceError("Unidade fora do seu escopo de acesso.", 403);
  }

  const abertos = getCadastros().debitos.filter((item) => item.unidadeId === unidadeId && debitoEmAberto(item));
  if (abertos.length > 0 && !opcoes?.forcar) {
    throw new DebitoServiceError(
      "Ainda há débitos em aberto nesta unidade. Confirme a quitação mesmo assim ou regularize os débitos antes.",
      409,
    );
  }

  const anterior = { ...unidade };
  const atualizada = { ...unidade, situacao: "Quitada" as const };
  setUnidades((current) => current.map((item) => (item.id === unidadeId ? atualizada : item)));

  registrarAuditoria(
    {
      entidade: "unit",
      registroId: String(unidadeId),
      acao: "UPDATE",
      dadosAnteriores: JSON.stringify({ situacao: anterior.situacao }),
      dadosNovos: JSON.stringify({ situacao: atualizada.situacao, debitosAbertos: abertos.length }),
      camposAlterados: "situacao",
    },
    userId,
    meta,
  );

  return { unidade: atualizada, debitosAbertos: abertos.length };
}

export function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}
