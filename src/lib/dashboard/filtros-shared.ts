/** Tipos e helpers de filtro do dashboard seguros para o cliente. */
import {
  formatarData,
  hojeIso,
  LIMITE_AMIGAVEL_DIAS,
  origensDebito,
  type Unidade,
} from "@/data/catalogo";
import {
  FAIXAS_ATRASO_DASHBOARD_ATENDENTE,
  type FaixaAtrasoDashboardId,
} from "@/lib/dashboard/faixas-atraso";
import { type TipoPendenciaId } from "@/lib/dashboard/pendencias-labels";
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

export function rotulosFiltrosAtivos(
  filtros: DashboardFiltrosNorm,
  cadastros: { condominios: { id: number; nome: string }[]; unidades: { id: number; identificacao: string }[] },
): DashboardFiltrosAtivos {
  const ativos: DashboardFiltrosAtivos = [];

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

  return ativos;
}

export function situacoesFiltroDashboard(unidades: Unidade[]): string[] {
  const valores = new Set<string>();
  for (const item of unidades) valores.add(item.situacao || "Sem cobrança");
  return [...valores].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
