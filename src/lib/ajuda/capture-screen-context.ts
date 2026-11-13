const MAX_CHARS = 3_500;

const IGNORAR_SELETORES = [
  "[data-assistente-ajuda]",
  "nav",
  "aside",
  "[role='navigation']",
  "script",
  "style",
  "noscript",
];

/** Coleta textos visíveis da área principal para contextualizar o assistente (somente no cliente). */
export function captureScreenContext(): string {
  if (typeof document === "undefined") return "";

  const host = document.querySelector("main") ?? document.querySelector("[data-page-content]") ?? document.body;
  const clone = host.cloneNode(true) as HTMLElement;
  for (const sel of IGNORAR_SELETORES) {
    clone.querySelectorAll(sel).forEach((el) => el.remove());
  }

  const partes: string[] = [];
  const titulo = document.title?.trim();
  if (titulo) partes.push(`Título da aba: ${titulo}`);

  const h1 = clone.querySelector("h1");
  if (h1?.textContent?.trim()) partes.push(`Cabeçalho: ${h1.textContent.trim()}`);

  clone.querySelectorAll("h2, h3").forEach((el) => {
    const t = el.textContent?.trim();
    if (t) partes.push(`Seção: ${t}`);
  });

  const botoes = new Set<string>();
  clone.querySelectorAll("button, a[role='button'], [type='submit']").forEach((el) => {
    const t = el.textContent?.replace(/\s+/g, " ").trim();
    if (t && t.length < 80) botoes.add(t);
  });
  if (botoes.size > 0) {
    partes.push(`Ações/botões visíveis: ${[...botoes].slice(0, 24).join("; ")}`);
  }

  const labels = new Set<string>();
  clone.querySelectorAll("label, th, [aria-label]").forEach((el) => {
    const fromAria = el.getAttribute("aria-label");
    const t = (fromAria ?? el.textContent)?.replace(/\s+/g, " ").trim();
    if (t && t.length > 1 && t.length < 120) labels.add(t);
  });
  if (labels.size > 0) {
    partes.push(`Rótulos/colunas: ${[...labels].slice(0, 30).join("; ")}`);
  }

  const texto = partes.join("\n");
  return texto.length > MAX_CHARS ? `${texto.slice(0, MAX_CHARS)}\n[… contexto truncado …]` : texto;
}
