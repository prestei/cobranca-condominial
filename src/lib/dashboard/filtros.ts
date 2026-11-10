import {
  debitoAbertoNaData,
  diasDeAtraso,
  escopoCondominios,
  formatarData,
  hojeIso,
  LIMITE_AMIGAVEL_DIAS,
  origensDebito,
  type Unidade,
} from "@/data/catalogo";
import { getCadastros } from "@/data/catalogo-store";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";
import { listarFilaCobranca, type FilaCobrancaItem } from "@/lib/fila/service";
import type { DebitoFiltros } from "@/lib/debitos/service";
import {
  FAIXAS_ATRASO_DASHBOARD_ATENDENTE,
  type FaixaAtrasoDashboardId,
} from "@/lib/dashboard/faixas-atraso";
import {
  classificarTipoPendenciaUnidade,
  type TipoPendenciaId,
} from "@/lib/dashboard/central-pendencias-atendente";
import { hojeEmFuso } from "@/lib/notificacoes/timezone";
import { rotuloPeriodo, resolverPeriodo, type PeriodPreset, type PeriodValue } from "@/lib/periodo";

export type DashboardFiltros = {
  periodo?: PeriodValue;
  dataBase?: string;
  limiteDias?: number;
  condominioId?: number;
  unidadeId?: number;
  situacao?: string;
  tipoPendencia?: TipoPendenciaId;
  faixaAtraso?: FaixaAtrasoDashboardId;
  origem?: string;
  retornoDe?: string;
  retornoAte?: string;
  busca?: string;
};

export type DashboardFiltrosNorm = DashboardFiltros & {
  periodoResolvido: { inicio: string; fim: string };
  dataBase: string;
  limiteDias: number;
};

export type DashboardFiltrosAtivos = {
  chave: string;
  rotulo: string;
}[];

const TIPOS_PENDENCIA = new Set<string>([
  "hoje",
  "atrasadas",
  "proximos_retornos",
  "aguardando_resposta",
  "sem_movimentacao",
  "prioritarias",
]);

const FAIXAS = new Set(FAIXAS_ATRASO_DASHBOARD_ATENDENTE.map((item) => item.id));

function isoValido(value: string | null | undefined) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function parsePeriodValue(searchParams: URLSearchParams, hoje: string): PeriodValue {
  const presetRaw = searchParams.get("periodo")?.trim() ?? searchParams.get("preset")?.trim();
  const de = searchParams.get("de")?.trim() ?? "";
  const ate = searchParams.get("ate")?.trim() ?? "";
  if (presetRaw === "personalizado" || (isoValido(de) || isoValido(ate))) {
    return { preset: "personalizado", de: isoValido(de) ? de : "", ate: isoValido(ate) ? ate : "" };
  }
  const presets: PeriodPreset[] = ["hoje", "ontem", "7", "30", "mes", "anterior", "todos"];
  if (presetRaw && presets.includes(presetRaw as PeriodPreset)) {
    return { preset: presetRaw as PeriodPreset, de: "", ate: "" };
  }
  if (de && ate && isoValido(de) && isoValido(ate)) {
    return { preset: "personalizado", de, ate };
  }
  return { preset: "7", de: "", ate: "" };
}

export function filtrosDashboardPadrao(hoje = hojeIso()): DashboardFiltrosNorm {
  const periodo: PeriodValue = { preset: "7", de: "", ate: "" };
  return normalizarFiltrosDashboard({}, hoje, periodo);
}

export function parseFiltrosDashboard(searchParams: URLSearchParams, hoje = hojeIso()): DashboardFiltrosNorm {
  const periodo = parsePeriodValue(searchParams, hoje);
  const raw: DashboardFiltros = { periodo };

  const dataBase = searchParams.get("dataBase")?.trim();
  if (isoValido(dataBase)) raw.dataBase = dataBase;

  const limite = Number(searchParams.get("limiteDias"));
  if (Number.isFinite(limite) && limite >= 1) raw.limiteDias = limite;

  const condominioId = Number(searchParams.get("condominioId") ?? searchParams.get("condominio"));
  if (Number.isFinite(condominioId) && condominioId > 0) raw.condominioId = condominioId;

  const unidadeId = Number(searchParams.get("unidadeId") ?? searchParams.get("unidade"));
  if (Number.isFinite(unidadeId) && unidadeId > 0) raw.unidadeId = unidadeId;

  const situacao = searchParams.get("situacao")?.trim();
  if (situacao && situacao !== "todos") raw.situacao = situacao;

  const tipo = searchParams.get("tipoPendencia")?.trim() ?? searchParams.get("tipo")?.trim();
  if (tipo && TIPOS_PENDENCIA.has(tipo)) raw.tipoPendencia = tipo as TipoPendenciaId;

  const faixa = searchParams.get("faixaAtraso")?.trim();
  if (faixa && FAIXAS.has(faixa as FaixaAtrasoDashboardId)) raw.faixaAtraso = faixa as FaixaAtrasoDashboardId;

  const origem = searchParams.get("origem")?.trim();
  if (origem && origem !== "todas" && (origensDebito as readonly string[]).includes(origem)) raw.origem = origem;

  const retornoDe = searchParams.get("retornoDe")?.trim();
  const retornoAte = searchParams.get("retornoAte")?.trim();
  if (isoValido(retornoDe)) raw.retornoDe = retornoDe;
  if (isoValido(retornoAte)) raw.retornoAte = retornoAte;

  const busca = searchParams.get("q") ?? searchParams.get("busca");
  if (busca?.trim()) raw.busca = busca.trim();

  return normalizarFiltrosDashboard(raw, hoje, periodo);
}

export function normalizarFiltrosDashboard(
  raw: DashboardFiltros,
  hoje: string,
  periodo: PeriodValue,
): DashboardFiltrosNorm {
  const periodoResolvido = resolverPeriodo(periodo, hoje);
  let dataBase = raw.dataBase?.trim() && isoValido(raw.dataBase) ? raw.dataBase.trim() : hoje;
  if (periodo.preset === "personalizado" && periodoResolvido.fim) {
    dataBase = periodoResolvido.fim > dataBase ? periodoResolvido.fim : dataBase;
  }
  const limiteDias =
    raw.limiteDias != null && Number.isFinite(raw.limiteDias) && raw.limiteDias >= 1
      ? raw.limiteDias
      : LIMITE_AMIGAVEL_DIAS;

  const norm: DashboardFiltrosNorm = {
    ...raw,
    periodo: periodo,
    periodoResolvido,
    dataBase,
    limiteDias,
  };

  if (norm.retornoDe && norm.retornoAte && norm.retornoDe > norm.retornoAte) {
    const swap = norm.retornoDe;
    norm.retornoDe = norm.retornoAte;
    norm.retornoAte = swap;
  }

  if (norm.periodoResolvido.inicio && norm.periodoResolvido.fim && norm.periodoResolvido.inicio > norm.periodoResolvido.fim) {
    const swap = norm.periodoResolvido.inicio;
    norm.periodoResolvido.inicio = norm.periodoResolvido.fim;
    norm.periodoResolvido.fim = swap;
  }

  return norm;
}

export function validarFiltrosDashboardEscopo(userId: number, filtros: DashboardFiltrosNorm) {
  const condominios = new Set(escopoCondominios(getCadastros(), userId).map((item) => item.id));
  if (filtros.condominioId && !condominios.has(filtros.condominioId)) {
    throw new DashboardFiltrosError("Condomínio fora do seu escopo.", 403);
  }
  if (filtros.unidadeId) {
    const unidade = getCadastros().unidades.find((item) => item.id === filtros.unidadeId);
    if (!unidade || !condominios.has(unidade.condominioId)) {
      throw new DashboardFiltrosError("Unidade fora do seu escopo.", 403);
    }
    if (filtros.condominioId && unidade.condominioId !== filtros.condominioId) {
      throw new DashboardFiltrosError("A unidade não pertence ao condomínio filtrado.", 400);
    }
  }
}

export class DashboardFiltrosError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function filtrosDashboardTemRecorte(filtros: DashboardFiltrosNorm): boolean {
  return Boolean(
    filtros.condominioId ||
      filtros.unidadeId ||
      (filtros.situacao && filtros.situacao !== "todos") ||
      filtros.tipoPendencia ||
      filtros.faixaAtraso ||
      (filtros.origem && filtros.origem !== "todas") ||
      filtros.retornoDe ||
      filtros.retornoAte ||
      filtros.busca?.trim() ||
      (filtros.periodo?.preset && filtros.periodo.preset !== "7"),
  );
}

function textoBuscaItem(userId: number, item: FilaCobrancaItem): string {
  const cadastros = getCadastros();
  const perm = permissoesDoUsuarioId(userId);
  const condominio = cadastros.condominios.find((c) => c.id === item.condominioId)?.nome ?? "";
  let texto = `${condominio} ${item.identificacao} ${item.bloco} ${item.codigoRe ?? ""}`;
  if (temPermissao(perm, "unidades", "ler")) {
    for (const vinculo of cadastros.vinculos.filter((v) => v.unidadeId === item.unidadeId)) {
      const responsavel = cadastros.responsaveis.find((r) => r.id === vinculo.responsavelId);
      if (responsavel) {
        texto += ` ${responsavel.nome} ${responsavel.cpfCnpj} ${responsavel.email} ${responsavel.telefone}`;
      }
    }
  }
  return texto.toLocaleLowerCase("pt-BR");
}

function atendimentoReferenciaPendencia(unidadeId: number) {
  const lista = getCadastros()
    .atendimentos.filter((item) => Number(item.unidadeId) === unidadeId)
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  return lista[0] ?? null;
}

function passaFaixaAtraso(item: FilaCobrancaItem, faixaId: FaixaAtrasoDashboardId, dataBase: string) {
  const faixa = FAIXAS_ATRASO_DASHBOARD_ATENDENTE.find((f) => f.id === faixaId);
  if (!faixa) return true;
  const dias = item.diasAtrasoMax > 0 ? item.diasAtrasoMax : 0;
  if (dias === 0) {
    const debitos = getCadastros().debitos.filter(
      (d) => d.unidadeId === item.unidadeId && debitoAbertoNaData(d, dataBase),
    );
    let max = 0;
    for (const debito of debitos) max = Math.max(max, diasDeAtraso(debito.dataVencimento, dataBase));
    if (max < faixa.min || max > faixa.max) return false;
    return true;
  }
  return dias >= faixa.min && dias <= faixa.max;
}

function passaOrigem(unidadeId: number, origem: string, dataBase: string) {
  return getCadastros().debitos.some(
    (item) =>
      item.unidadeId === unidadeId &&
      item.origem === origem &&
      debitoAbertoNaData(item, dataBase),
  );
}

function passaTipoPendencia(item: FilaCobrancaItem, tipo: TipoPendenciaId, hoje: string) {
  const atendimento = atendimentoReferenciaPendencia(item.unidadeId);
  const classificado = classificarTipoPendenciaUnidade(item, atendimento, hoje);
  return classificado === tipo;
}

function passaRetorno(item: FilaCobrancaItem, de?: string, ate?: string) {
  const dia = item.proximoRetorno?.trim().slice(0, 10);
  if (!dia) return false;
  if (de && dia < de) return false;
  if (ate && dia > ate) return false;
  return true;
}

/** Conjunto de unidades da carteira que passam nos filtros de recorte (escopo já aplicado). `null` = sem recorte. */
export function resolverUnidadesDashboard(
  userId: number,
  filtros: DashboardFiltrosNorm,
): Set<number> | null {
  if (!filtrosDashboardTemRecorte(filtros)) return null;

  const hoje = hojeEmFuso();
  let itens = listarFilaCobranca(userId, {
    condominioId: filtros.condominioId,
    situacao: filtros.situacao,
  });

  if (filtros.unidadeId) {
    itens = itens.filter((item) => item.unidadeId === filtros.unidadeId);
  }
  if (filtros.faixaAtraso) {
    itens = itens.filter((item) => passaFaixaAtraso(item, filtros.faixaAtraso!, filtros.dataBase));
  }
  if (filtros.origem) {
    itens = itens.filter((item) => passaOrigem(item.unidadeId, filtros.origem!, filtros.dataBase));
  }
  if (filtros.tipoPendencia) {
    itens = itens.filter((item) => passaTipoPendencia(item, filtros.tipoPendencia!, hoje));
  }
  if (filtros.retornoDe || filtros.retornoAte) {
    itens = itens.filter((item) => passaRetorno(item, filtros.retornoDe, filtros.retornoAte));
  }
  if (filtros.busca?.trim()) {
    const termo = filtros.busca.trim().toLocaleLowerCase("pt-BR");
    itens = itens.filter((item) => textoBuscaItem(userId, item).includes(termo));
  }

  return new Set(itens.map((item) => item.unidadeId));
}

export function debitoFiltrosDoDashboard(
  filtros: DashboardFiltrosNorm,
  unidadeIds: Set<number> | null,
): DebitoFiltros {
  const base: DebitoFiltros = {};
  if (filtros.condominioId) base.condominioId = filtros.condominioId;
  if (filtros.unidadeId) base.unidadeId = filtros.unidadeId;
  if (filtros.origem) base.origem = filtros.origem;
  if (filtros.busca?.trim()) base.busca = filtros.busca.trim();
  if (unidadeIds && unidadeIds.size === 1) {
    base.unidadeId = [...unidadeIds][0];
  }
  return base;
}

export function filtrarDebitosPorUnidades<T extends { unidadeId: number }>(lista: T[], unidadeIds: Set<number> | null) {
  if (!unidadeIds) return lista;
  return lista.filter((item) => unidadeIds.has(item.unidadeId));
}

export function filtrarPorUnidadeId<T extends { unidadeId: number }>(lista: T[], unidadeIds: Set<number> | null) {
  if (!unidadeIds) return lista;
  return lista.filter((item) => unidadeIds.has(item.unidadeId));
}

export function atendimentoNoRecorte(unidadeId: string | number, unidadeIds: Set<number> | null) {
  if (!unidadeIds) return true;
  return unidadeIds.has(Number(unidadeId));
}

export function serializarFiltrosDashboard(filtros: DashboardFiltrosNorm): URLSearchParams {
  const params = new URLSearchParams();
  if (filtros.periodo) {
    params.set("periodo", filtros.periodo.preset);
    if (filtros.periodo.preset === "personalizado") {
      if (filtros.periodo.de) params.set("de", filtros.periodo.de);
      if (filtros.periodo.ate) params.set("ate", filtros.periodo.ate);
    }
  }
  if (filtros.dataBase && filtros.dataBase !== hojeIso()) params.set("dataBase", filtros.dataBase);
  if (filtros.limiteDias !== LIMITE_AMIGAVEL_DIAS) params.set("limiteDias", String(filtros.limiteDias));
  if (filtros.condominioId) params.set("condominioId", String(filtros.condominioId));
  if (filtros.unidadeId) params.set("unidadeId", String(filtros.unidadeId));
  if (filtros.situacao) params.set("situacao", filtros.situacao);
  if (filtros.tipoPendencia) params.set("tipoPendencia", filtros.tipoPendencia);
  if (filtros.faixaAtraso) params.set("faixaAtraso", filtros.faixaAtraso);
  if (filtros.origem) params.set("origem", filtros.origem);
  if (filtros.retornoDe) params.set("retornoDe", filtros.retornoDe);
  if (filtros.retornoAte) params.set("retornoAte", filtros.retornoAte);
  if (filtros.busca?.trim()) params.set("q", filtros.busca.trim());
  return params;
}

export function queryNavegacaoDebitos(filtros: DashboardFiltrosNorm): string {
  const params = serializarFiltrosDashboard(filtros);
  params.delete("periodo");
  params.delete("de");
  params.delete("ate");
  if (filtros.condominioId) {
    params.delete("condominioId");
    params.set("condominio", String(filtros.condominioId));
  }
  if (filtros.unidadeId) {
    params.delete("unidadeId");
    params.set("unidade", String(filtros.unidadeId));
  }
  return params.toString();
}

export function queryNavegacaoAtendimentos(filtros: DashboardFiltrosNorm): string {
  const params = new URLSearchParams();
  if (filtros.periodoResolvido.inicio) params.set("de", filtros.periodoResolvido.inicio);
  if (filtros.periodoResolvido.fim) params.set("ate", filtros.periodoResolvido.fim);
  if (filtros.unidadeId) params.set("unidade", String(filtros.unidadeId));
  if (filtros.busca?.trim()) params.set("q", filtros.busca.trim());
  return params.toString();
}

export function rotulosFiltrosAtivos(filtros: DashboardFiltrosNorm, userId: number): DashboardFiltrosAtivos {
  const ativos: DashboardFiltrosAtivos = [];
  const cadastros = getCadastros();

  if (filtros.periodo && filtros.periodo.preset !== "7") {
    ativos.push({ chave: "periodo", rotulo: `Período: ${rotuloPeriodo(filtros.periodo)}` });
  } else if (filtros.periodo?.preset === "personalizado") {
    ativos.push({
      chave: "periodo",
      rotulo: `Período: ${formatarData(filtros.periodoResolvido.inicio)} a ${formatarData(filtros.periodoResolvido.fim)}`,
    });
  }

  if (filtros.dataBase !== hojeIso()) {
    ativos.push({ chave: "dataBase", rotulo: `Data-base: ${formatarData(filtros.dataBase)}` });
  }
  if (filtros.limiteDias !== LIMITE_AMIGAVEL_DIAS) {
    ativos.push({ chave: "limiteDias", rotulo: `Limite amigável: ${filtros.limiteDias} dias` });
  }
  if (filtros.condominioId) {
    const nome = cadastros.condominios.find((c) => c.id === filtros.condominioId)?.nome ?? String(filtros.condominioId);
    ativos.push({ chave: "condominioId", rotulo: `Condomínio: ${nome}` });
  }
  if (filtros.unidadeId) {
    const unidade = cadastros.unidades.find((u) => u.id === filtros.unidadeId);
    ativos.push({
      chave: "unidadeId",
      rotulo: `Unidade: ${unidade?.identificacao ?? filtros.unidadeId}`,
    });
  }
  if (filtros.situacao) ativos.push({ chave: "situacao", rotulo: `Situação: ${filtros.situacao}` });
  if (filtros.tipoPendencia) ativos.push({ chave: "tipoPendencia", rotulo: `Pendência: ${filtros.tipoPendencia}` });
  if (filtros.faixaAtraso) {
    const faixa = FAIXAS_ATRASO_DASHBOARD_ATENDENTE.find((f) => f.id === filtros.faixaAtraso);
    if (faixa) ativos.push({ chave: "faixaAtraso", rotulo: `Faixa: ${faixa.label}` });
  }
  if (filtros.origem) ativos.push({ chave: "origem", rotulo: `Origem: ${filtros.origem}` });
  if (filtros.retornoDe || filtros.retornoAte) {
    ativos.push({
      chave: "retorno",
      rotulo: `Retorno: ${filtros.retornoDe ? formatarData(filtros.retornoDe) : "…"} – ${filtros.retornoAte ? formatarData(filtros.retornoAte) : "…"}`,
    });
  }
  if (filtros.busca?.trim()) ativos.push({ chave: "busca", rotulo: `Busca: “${filtros.busca.trim()}”` });

  void userId;
  return ativos;
}

export function metaFiltrosDashboard(filtros: DashboardFiltrosNorm, userId: number): string[] {
  const linhas = [
    `Data-base: ${formatarData(filtros.dataBase)}`,
    `Limite cobrança amigável: ${filtros.limiteDias} dias`,
    `Período operacional: ${formatarData(filtros.periodoResolvido.inicio)} a ${formatarData(filtros.periodoResolvido.fim)}`,
  ];
  for (const item of rotulosFiltrosAtivos(filtros, userId)) {
    if (!["dataBase", "limiteDias", "periodo"].includes(item.chave)) linhas.push(item.rotulo);
  }
  return linhas;
}

export function situacoesFiltroDashboard(unidades: Unidade[]): string[] {
  const valores = new Set<string>();
  for (const item of unidades) valores.add(item.situacao || "Sem cobrança");
  return [...valores].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
