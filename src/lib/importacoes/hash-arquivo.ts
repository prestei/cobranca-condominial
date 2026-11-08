import { createHash } from "crypto";

export function hashConteudoArquivo(conteudo: string): string {
  const normalizado = conteudo.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  return createHash("sha256").update(normalizado, "utf8").digest("hex");
}

import type { RegistroAcaoImportacao } from "@/lib/importacao-centro/historico-types";
import type { ResumoInconsistenciasImportacao } from "@/lib/importacao-centro/situacao-importacao";

export type MetaObservacaoImportacao = {
  processoId?: string;
  hashArquivo?: string;
  formato?: string;
  iniciadoEm?: string;
  aprovadoEm?: string;
  usuarioIniciouId?: number;
  usuarioAprovouId?: number;
  resumoInconsistencias?: ResumoInconsistenciasImportacao;
  resultadoFinanceiro?: { valor: string; moeda: "BRL" };
  acoes?: RegistroAcaoImportacao[];
  relatorio?: {
    erros?: Array<{ linha: number; mensagem: string }>;
    ignorados?: Array<{ linha: number; mensagem: string }>;
    decisoes?: Array<{ linha: number; acao: string; motivo?: string }>;
    correcoesPrevia?: Array<{
      linha: number;
      campo: string;
      valorOriginal: string;
      valorCorrigido: string;
      aplicadoEm: string;
      usuarioId: number;
    }>;
  };
};

export function mergeObservacaoImportacao(
  base: MetaObservacaoImportacao,
  patch: Partial<MetaObservacaoImportacao>,
): MetaObservacaoImportacao {
  return {
    ...base,
    ...patch,
    relatorio: patch.relatorio ? { ...base.relatorio, ...patch.relatorio } : base.relatorio,
    resumoInconsistencias: patch.resumoInconsistencias ?? base.resumoInconsistencias,
    resultadoFinanceiro: patch.resultadoFinanceiro ?? base.resultadoFinanceiro,
    acoes: patch.acoes ?? base.acoes,
  };
}

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
