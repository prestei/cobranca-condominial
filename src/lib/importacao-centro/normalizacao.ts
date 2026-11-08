const MARCADORES_VAZIO = /^(?:—|-\s*|n\/a|null|nil|\.)$/i;

/** Indica célula sem conteúdo útil (espaços ou marcadores comuns de ausência). */
export function textoVazio(raw: string | undefined | null): boolean {
  const trimmed = (raw ?? "").trim();
  return !trimmed || MARCADORES_VAZIO.test(trimmed);
}

/** Cabeçalhos e rótulos: minúsculas, sem acento, espaço único — para mapeamento. */
export function normalizarCabecalhoPlanilha(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ");
}

/** Conteúdo estável para hash (BOM e quebras de linha). */
export function normalizarConteudoParaHash(conteudo: string): string {
  return conteudo.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
}
