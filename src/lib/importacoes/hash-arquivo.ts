import { createHash } from "crypto";

export function hashConteudoArquivo(conteudo: string): string {
  const normalizado = conteudo.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  return createHash("sha256").update(normalizado, "utf8").digest("hex");
}

export type MetaObservacaoImportacao = {
  hashArquivo?: string;
  formato?: string;
  relatorio?: {
    erros?: Array<{ linha: number; mensagem: string }>;
    ignorados?: Array<{ linha: number; mensagem: string }>;
  };
};

export function parseObservacaoImportacao(texto: string): MetaObservacaoImportacao {
  const trimmed = texto.trim();
  if (!trimmed.startsWith("{")) return { relatorio: { erros: [], ignorados: [] } };
  try {
    const parsed = JSON.parse(trimmed) as MetaObservacaoImportacao;
    return parsed ?? {};
  } catch {
    return { relatorio: { erros: [{ linha: 0, mensagem: trimmed }] } };
  }
}

export function serializarObservacaoImportacao(meta: MetaObservacaoImportacao, legado?: string): string {
  const base = meta.relatorio?.erros?.length || meta.hashArquivo ? meta : { ...meta };
  if (!legado?.trim() || legado.trim().startsWith("{")) {
    return JSON.stringify(base);
  }
  return JSON.stringify({ ...base, notaLegado: legado.trim() });
}
