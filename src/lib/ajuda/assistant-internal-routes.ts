/** Prefixos de rota interna que o assistente pode sugerir como link (sem URL externa). */
const ROTAS_INTERNAS = [
  "/",
  "/ajuda",
  "/atendimentos",
  "/minha-agenda",
  "/debitos",
  "/negociacoes",
  "/juridico",
  "/condominios",
  "/unidades",
  "/relatorios",
  "/importacoes",
  "/usuarios",
  "/cargos",
  "/auditoria",
  "/notificacoes",
  "/conta",
] as const;

export function normalizarHrefInterno(href: string): string {
  const limpo = href.trim().replace(/[.,;:!?)]+$/, "");
  const [path, query] = limpo.split("?");
  const base = path ?? "";
  return query ? `${base}?${query}` : base;
}

/** Aceita só caminhos do painel (relativo, sem http/https). */
export function isAssistantInternalHref(href: string): boolean {
  const path = normalizarHrefInterno(href).split("?")[0] ?? "";
  if (!path.startsWith("/") || path.startsWith("//")) return false;
  if (/^[a-z]+:/i.test(href.trim())) return false;
  if (path === "/") return true;
  return ROTAS_INTERNAS.some((base) => base !== "/" && (path === base || path.startsWith(`${base}/`)));
}