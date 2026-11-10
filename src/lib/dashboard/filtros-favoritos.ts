import type { DashboardFiltros } from "@/lib/dashboard/filtros-shared";

export type FiltroFavoritoDashboard = {
  id: string;
  nome: string;
  filtros: DashboardFiltros;
  criadoEm: string;
};

const CHAVE = "cobranca.dashboard.favoritos";

function chaveUsuario(userId: number) {
  return `${CHAVE}.${userId}`;
}

export function listarFavoritosDashboard(userId: number): FiltroFavoritoDashboard[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(chaveUsuario(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FiltroFavoritoDashboard[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function salvarFavoritoDashboard(userId: number, nome: string, filtros: DashboardFiltros): FiltroFavoritoDashboard[] {
  const lista = listarFavoritosDashboard(userId);
  const item: FiltroFavoritoDashboard = {
    id: crypto.randomUUID(),
    nome: nome.trim() || "Filtro favorito",
    filtros,
    criadoEm: new Date().toISOString(),
  };
  const next = [item, ...lista].slice(0, 12);
  localStorage.setItem(chaveUsuario(userId), JSON.stringify(next));
  return next;
}

export function removerFavoritoDashboard(userId: number, id: string): FiltroFavoritoDashboard[] {
  const next = listarFavoritosDashboard(userId).filter((item) => item.id !== id);
  localStorage.setItem(chaveUsuario(userId), JSON.stringify(next));
  return next;
}

export const CHAVE_SESSAO_DASHBOARD_FILTROS = "cobranca.dashboard.filtros.sessao";

export function persistirFiltrosSessao(query: string) {
  if (typeof sessionStorage === "undefined") return;
  if (!query.trim()) {
    sessionStorage.removeItem(CHAVE_SESSAO_DASHBOARD_FILTROS);
    return;
  }
  sessionStorage.setItem(CHAVE_SESSAO_DASHBOARD_FILTROS, query);
}

export function lerFiltrosSessao(): string {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(CHAVE_SESSAO_DASHBOARD_FILTROS) ?? "";
}

/** Parâmetros do dashboard reutilizáveis em `/debitos`. */
export function querySessaoParaDebitos(): string {
  const raw = lerFiltrosSessao();
  if (!raw) return "";
  const entrada = new URLSearchParams(raw);
  const saida = new URLSearchParams();
  const condominioId = entrada.get("condominioId");
  if (condominioId) saida.set("condominio", condominioId);
  const unidadeId = entrada.get("unidadeId");
  if (unidadeId) saida.set("unidade", unidadeId);
  for (const key of ["dataBase", "limiteDias", "origem", "faixaAtraso", "q", "situacao"] as const) {
    const valor = entrada.get(key);
    if (valor) saida.set(key, valor);
  }
  return saida.toString();
}

export function querySessaoParaAtendimentos(): string {
  const raw = lerFiltrosSessao();
  if (!raw) return "";
  const entrada = new URLSearchParams(raw);
  const saida = new URLSearchParams();
  if (entrada.get("de")) saida.set("de", entrada.get("de")!);
  if (entrada.get("ate")) saida.set("ate", entrada.get("ate")!);
  if (entrada.get("unidadeId")) saida.set("unidade", entrada.get("unidadeId")!);
  if (entrada.get("q")) saida.set("q", entrada.get("q")!);
  return saida.toString();
}
