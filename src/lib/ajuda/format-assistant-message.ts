import { isAssistantInternalHref, normalizarHrefInterno } from "@/lib/ajuda/assistant-internal-routes";

export type SegmentoMensagemAssistente =
  | { tipo: "texto"; valor: string }
  | { tipo: "link"; rotulo: string; href: string };

/**
 * Normaliza respostas do modelo que vêm com markdown leve (*, **) para leitura no chat.
 */
export function formatAssistantMessageForDisplay(text: string): string {
  let out = text.trim();
  if (!out) return out;

  out = out.replace(/\s+\*\s+\*\*([^*]+)\*\*:\s*/g, "\n• $1: ");
  out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
  out = out.replace(/__([^_]+)__/g, "$1");
  out = out.replace(/^\s*#{1,6}\s+/gm, "");
  out = out.replace(/\s+\*\s+(?=\S)/g, "\n• ");
  out = out.replace(/^\s*-\s+/gm, "• ");

  return out.trim();
}

function segmentosTextoComCaminhos(texto: string): SegmentoMensagemAssistente[] {
  const partes: SegmentoMensagemAssistente[] = [];
  const re = /(\/[a-z0-9][a-z0-9/_-]*(?:\?[^\s.,;:!?)]*)?)/gi;
  let ultimo = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(texto)) !== null) {
    const href = normalizarHrefInterno(match[1]!);
    if (!isAssistantInternalHref(href)) continue;
    if (match.index > ultimo) {
      partes.push({ tipo: "texto", valor: texto.slice(ultimo, match.index) });
    }
    partes.push({ tipo: "link", rotulo: href, href });
    ultimo = match.index + match[0].length;
  }
  if (ultimo < texto.length) {
    partes.push({ tipo: "texto", valor: texto.slice(ultimo) });
  }
  if (partes.length === 0 && texto) {
    partes.push({ tipo: "texto", valor: texto });
  }
  return partes;
}

/** Divide o texto em trechos e links internos `[rótulo](/rota)` ou caminhos `/rota`. */
export function parseAssistantMessageSegments(text: string): SegmentoMensagemAssistente[] {
  const normalizado = formatAssistantMessageForDisplay(text);
  const saida: SegmentoMensagemAssistente[] = [];
  const reMarkdown = /\[([^\]]+)\]\((\/[^)\s]+)\)/g;
  let ultimo = 0;
  let match: RegExpExecArray | null;

  while ((match = reMarkdown.exec(normalizado)) !== null) {
    const href = normalizarHrefInterno(match[2]!);
    if (match.index > ultimo) {
      saida.push(...segmentosTextoComCaminhos(normalizado.slice(ultimo, match.index)));
    }
    if (isAssistantInternalHref(href)) {
      saida.push({ tipo: "link", rotulo: match[1]!.trim(), href });
    } else {
      saida.push({ tipo: "texto", valor: match[0] });
    }
    ultimo = match.index + match[0].length;
  }

  if (ultimo < normalizado.length) {
    saida.push(...segmentosTextoComCaminhos(normalizado.slice(ultimo)));
  }

  if (saida.length === 0 && normalizado) {
    saida.push({ tipo: "texto", valor: normalizado });
  }

  return saida;
}