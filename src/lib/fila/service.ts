import {
  debitoEmAberto,
  diasDeAtraso,
  escopoCondominios,
  escopoUnidades,
  formatarMoeda,
  getCadastros,
  hojeIso,
  retornoPendente,
  situacaoCobrancaUnidade,
  situacaoRetorno,
  unidadeNaFilaCobrancaAtiva,
  type AtribuicaoCobranca,
  type Unidade,
} from "@/data/catalogo";
import { codigoReDoUsuario } from "@/lib/colaboradores/re";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

export class FilaServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type FilaCobrancaItem = {
  unidadeId: number;
  condominioId: number;
  identificacao: string;
  bloco: string;
  situacao: string;
  codigoRe: string | null;
  atendenteId: number | null;
  valorInadimplencia: string | null;
  diasAtrasoMax: number;
  ultimoAtendimento: string | null;
  proximoRetorno: string | null;
  proximoRetornoAtendimentoId: string | null;
  retornoSituacao: string;
};

export type FilaCobrancaResumo = {
  emCobranca: number;
  semResponsavel: number;
  retornosHoje: number;
};

export type FilaOrdenacaoCampo =
  | "condominio"
  | "unidade"
  | "inadimplencia"
  | "situacao"
  | "re"
  | "ultimoAtendimento"
  | "proximoRetorno";

export type FilaCobrancaFiltros = {
  condominioId?: number;
  situacao?: string;
  atendenteId?: number;
  codigoRe?: string;
  semResponsavel?: boolean;
  busca?: string;
  retorno?: "atrasado" | "hoje" | "semana" | "sem" | "todos";
  sort?: FilaOrdenacaoCampo;
  order?: "asc" | "desc";
};

function usuarioVeCarteiraGeral(userId: number) {
  const perm = permissoesDoUsuarioId(userId);
  return temPermissao(perm, "usuarios", "criar");
}

function atribuicaoVigente(unidadeId: number): AtribuicaoCobranca | undefined {
  return getCadastros().atribuicoesCobranca.find((item) => item.unidadeId === unidadeId && !item.encerradoEm);
}

function unidadeElegivelFila(unidade: Unidade) {
  if (unidade.status === "Inativa") return false;
  return unidadeNaFilaCobrancaAtiva(unidade);
}

function resumoInadimplenciaUnidade(unidadeId: number) {
  const hoje = hojeIso();
  const debitos = getCadastros().debitos.filter((item) => item.unidadeId === unidadeId && debitoEmAberto(item));
  if (debitos.length === 0) return { valor: null as string | null, diasMax: 0 };
  let total = 0;
  let diasMax = 0;
  for (const debito of debitos) {
    const valor = Number.parseFloat(debito.valorAtualizado || debito.valor || "0");
    if (Number.isFinite(valor)) total += valor;
    diasMax = Math.max(diasMax, diasDeAtraso(debito.dataVencimento, hoje));
  }
  return { valor: formatarMoeda(total.toFixed(2)), diasMax };
}

function resumoAtendimentosUnidade(unidadeId: number) {
  const lista = getCadastros()
    .atendimentos.filter((item) => Number(item.unidadeId) === unidadeId)
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  const ultimo = lista[0]?.dataHora ?? null;
  const pendentesRetorno = lista.filter(retornoPendente).sort((a, b) => {
    const da = a.dataProximaAcao || "";
    const db = b.dataProximaAcao || "";
    return da.localeCompare(db);
  });
  const proximo = pendentesRetorno[0];
  const proximoRetorno = proximo?.dataProximaAcao ?? null;
  return {
    ultimoAtendimento: ultimo,
    proximoRetorno,
    proximoRetornoAtendimentoId: proximo?.id ?? null,
    retornoSituacao: proximoRetorno ? situacaoRetorno(proximoRetorno) : "",
  };
}

function montarItem(unidade: Unidade): FilaCobrancaItem {
  const vigente = atribuicaoVigente(unidade.id);
  const atendente = vigente ? getCadastros().usuarios.find((item) => item.id === vigente.atendenteId) : undefined;
  const inad = resumoInadimplenciaUnidade(unidade.id);
  const atend = resumoAtendimentosUnidade(unidade.id);
  return {
    unidadeId: unidade.id,
    condominioId: unidade.condominioId,
    identificacao: unidade.identificacao,
    bloco: unidade.bloco,
    situacao: situacaoCobrancaUnidade(unidade),
    codigoRe: atendente ? codigoReDoUsuario(atendente) : null,
    atendenteId: vigente?.atendenteId ?? null,
    valorInadimplencia: inad.valor,
    diasAtrasoMax: inad.diasMax,
    ultimoAtendimento: atend.ultimoAtendimento,
    proximoRetorno: atend.proximoRetorno,
    proximoRetornoAtendimentoId: atend.proximoRetornoAtendimentoId,
    retornoSituacao: atend.retornoSituacao,
  };
}

export function resumoFilaCobranca(userId: number, filtros?: FilaCobrancaFiltros): FilaCobrancaResumo {
  const lista = listarFilaCobranca(userId, filtros);
  return {
    emCobranca: lista.length,
    semResponsavel: lista.filter((item) => !item.codigoRe).length,
    retornosHoje: lista.filter((item) => item.retornoSituacao === "hoje").length,
  };
}

function unidadesBase(userId: number) {
  const ids = new Set(escopoCondominios(getCadastros(), userId).map((item) => item.id));
  return escopoUnidades(getCadastros(), userId).filter(
    (item) => ids.has(item.condominioId) && unidadeElegivelFila(item),
  );
}

function aplicarFiltros(itens: FilaCobrancaItem[], filtros: FilaCobrancaFiltros | undefined, userId: number) {
  let lista = itens;
  const geral = usuarioVeCarteiraGeral(userId);
  if (!geral) {
    lista = lista.filter((item) => item.atendenteId === userId);
  }
  if (filtros?.condominioId) lista = lista.filter((item) => item.condominioId === filtros.condominioId);
  if (filtros?.situacao && filtros.situacao !== "todos") {
    lista = lista.filter((item) => item.situacao === filtros.situacao);
  }
  if (geral && filtros?.atendenteId) {
    lista = lista.filter((item) => item.atendenteId === filtros.atendenteId);
  }
  if (geral && filtros?.semResponsavel) {
    lista = lista.filter((item) => !item.codigoRe);
  } else if (geral && filtros?.codigoRe?.trim()) {
    const alvo = filtros.codigoRe.trim().toUpperCase();
    lista = lista.filter((item) => item.codigoRe?.toUpperCase() === alvo);
  }
  if (filtros?.retorno && filtros.retorno !== "todos") {
    if (filtros.retorno === "sem") lista = lista.filter((item) => !item.proximoRetorno);
    else lista = lista.filter((item) => item.retornoSituacao === filtros.retorno);
  }
  const termo = filtros?.busca?.trim().toLocaleLowerCase("pt-BR");
  if (termo) {
    const cadastros = getCadastros();
    lista = lista.filter((item) => {
      const condominio = cadastros.condominios.find((c) => c.id === item.condominioId)?.nome ?? "";
      const texto = `${condominio} ${item.identificacao} ${item.bloco} ${item.codigoRe ?? ""}`.toLocaleLowerCase(
        "pt-BR",
      );
      return texto.includes(termo);
    });
  }
  return lista;
}

function nomeCondominioItem(item: FilaCobrancaItem) {
  return getCadastros().condominios.find((c) => c.id === item.condominioId)?.nome ?? "";
}

function compararFila(a: FilaCobrancaItem, b: FilaCobrancaItem, sort: FilaOrdenacaoCampo, factor: number) {
  switch (sort) {
    case "condominio": {
      const left = nomeCondominioItem(a);
      const right = nomeCondominioItem(b);
      return left.localeCompare(right, "pt-BR") * factor;
    }
    case "unidade": {
      const left = `${a.identificacao} ${a.bloco}`;
      const right = `${b.identificacao} ${b.bloco}`;
      return left.localeCompare(right, "pt-BR", { numeric: true }) * factor;
    }
    case "inadimplencia":
      return (a.diasAtrasoMax - b.diasAtrasoMax) * factor;
    case "situacao":
      return a.situacao.localeCompare(b.situacao, "pt-BR") * factor;
    case "re": {
      const left = a.codigoRe ?? "";
      const right = b.codigoRe ?? "";
      return left.localeCompare(right, "pt-BR") * factor;
    }
    case "ultimoAtendimento": {
      const left = a.ultimoAtendimento ?? "";
      const right = b.ultimoAtendimento ?? "";
      return left.localeCompare(right, "pt-BR") * factor;
    }
    case "proximoRetorno": {
      const left = a.proximoRetorno ?? "";
      const right = b.proximoRetorno ?? "";
      return left.localeCompare(right, "pt-BR") * factor;
    }
    default:
      return 0;
  }
}

function ordenarFila(lista: FilaCobrancaItem[], filtros?: FilaCobrancaFiltros) {
  const sort = filtros?.sort;
  const factor = filtros?.order === "desc" ? -1 : 1;
  return [...lista].sort((a, b) => {
    if (sort) {
      const cmp = compararFila(a, b, sort, factor);
      if (cmp !== 0) return cmp;
    }
    const cond = a.condominioId - b.condominioId;
    if (cond !== 0) return cond;
    return a.identificacao.localeCompare(b.identificacao, "pt-BR", { numeric: true });
  });
}

export function listarFilaCobranca(userId: number, filtros?: FilaCobrancaFiltros): FilaCobrancaItem[] {
  const base = unidadesBase(userId).map(montarItem);
  return ordenarFila(aplicarFiltros(base, filtros, userId), filtros);
}

export function listarFilaCobrancaPaginada(
  userId: number,
  filtros: FilaCobrancaFiltros | undefined,
  page: number,
  pageSize: number,
) {
  const todos = listarFilaCobranca(userId, filtros);
  const safePage = Math.max(1, page);
  const safeSize = Math.min(100, Math.max(1, pageSize));
  const start = (safePage - 1) * safeSize;
  return { itens: todos.slice(start, start + safeSize), total: todos.length, page: safePage, pageSize: safeSize };
}
