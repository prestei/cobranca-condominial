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

/** Monta uma linha de indicador para o contexto do assistente (testável sem DOM). */
export function formatarLinhaIndicador(input: { valor: string; rotulo: string; detalhe?: string | null }): string {
  const base = `${input.rotulo}: ${input.valor}`;
  const det = input.detalhe?.trim();
  return det ? `${base} (${det})` : base;
}

function elementoVisivel(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  let atual: HTMLElement | null = el;
  while (atual) {
    const estilo = window.getComputedStyle(atual);
    if (estilo.display === "none" || estilo.visibility === "hidden" || Number(estilo.opacity) === 0) return false;
    atual = atual.parentElement;
  }
  return true;
}

function textoLimpo(el: Element | null | undefined): string {
  return el?.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

/** Lê valor + rótulo (+ detalhe) a partir de um nó `.text-metric` visível. */
function parIndicadorAPartirDeMetrica(metricEl: Element): { valor: string; rotulo: string; detalhe: string | null } | null {
  const valor = textoLimpo(metricEl);
  if (!valor) return null;

  const coluna =
    metricEl.closest("article")?.querySelector(":scope > div:last-child") ??
    metricEl.parentElement;
  if (!coluna) return null;

  const textos = [...coluna.querySelectorAll("p, span")]
    .map((n) => textoLimpo(n))
    .filter(Boolean);

  const valorIdx = textos.findIndex((t) => t === valor);
  const rotulo = valorIdx >= 0 ? textos[valorIdx + 1] : textos[1];
  const detalhe = valorIdx >= 0 ? textos[valorIdx + 2] : textos[2];

  if (!rotulo || rotulo === valor) return null;
  return { valor, rotulo, detalhe: detalhe && detalhe !== rotulo ? detalhe : null };
}

function coletarIndicadores(host: Element): string[] {
  const vistos = new Set<string>();
  const linhas: string[] = [];

  host.querySelectorAll(".text-metric").forEach((metricEl) => {
    if (!elementoVisivel(metricEl)) return;
    const par = parIndicadorAPartirDeMetrica(metricEl);
    if (!par) return;
    const linha = formatarLinhaIndicador(par);
    if (vistos.has(linha)) return;
    vistos.add(linha);
    linhas.push(linha);
  });

  return linhas.slice(0, 20);
}

function coletarFiltrosAplicados(host: Element): string[] {
  const linhas: string[] = [];
  const vistos = new Set<string>();

  host.querySelectorAll("label[for]").forEach((label) => {
    if (!elementoVisivel(label)) return;
    const forId = label.getAttribute("for");
    if (!forId) return;
    const control = host.querySelector(`#${CSS.escape(forId)}`);
    if (
      !control ||
      !(control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement)
    ) {
      return;
    }
    if (!elementoVisivel(control)) return;

    const rotulo = textoLimpo(label);
    let valor = "";
    if (control instanceof HTMLSelectElement) {
      valor = textoLimpo(control.selectedOptions[0] ?? control) || control.value;
    } else {
      valor = control.value.trim();
    }
    if (!rotulo || !valor) return;

    const linha = `${rotulo}: ${valor}`;
    if (vistos.has(linha)) return;
    vistos.add(linha);
    linhas.push(linha);
  });

  return linhas.slice(0, 16);
}

function coletarResumosPaginacao(host: Element): string[] {
  const linhas: string[] = [];
  host.querySelectorAll('nav[aria-label="Paginação"] > p').forEach((el) => {
    if (!elementoVisivel(el)) return;
    const t = textoLimpo(el);
    if (t) linhas.push(`Listagem: ${t}`);
  });
  return linhas;
}

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

  const indicadores = coletarIndicadores(host);
  if (indicadores.length > 0) {
    partes.push(`Indicadores/números visíveis na tela:\n${indicadores.map((l) => `- ${l}`).join("\n")}`);
  }

  const filtros = coletarFiltrosAplicados(host);
  if (filtros.length > 0) {
    partes.push(`Filtros/campos com valor agora:\n${filtros.map((l) => `- ${l}`).join("\n")}`);
  }

  const paginacao = coletarResumosPaginacao(host);
  if (paginacao.length > 0) {
    partes.push(paginacao.join("\n"));
  }

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
