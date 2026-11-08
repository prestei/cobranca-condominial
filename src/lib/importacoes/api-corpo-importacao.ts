import type { AcaoConflitoImportacao, DecisaoLinhaImportacao } from "@/lib/importacao-centro/detecao-duplicidades";

const ACOES_CONFLITO = new Set<AcaoConflitoImportacao>([
  "importar_novo",
  "ignorar_existente",
  "atualizar_existente",
  "solicitar_correcao",
  "revisao_manual",
]);

function parseAcaoConflito(acao: string): AcaoConflitoImportacao {
  return ACOES_CONFLITO.has(acao as AcaoConflitoImportacao) ? (acao as AcaoConflitoImportacao) : "revisao_manual";
}

export type CorpoPreviewConfirmarImportacao = {
  origem: string;
  arquivo?: string;
  conteudo?: string;
  processoId?: string;
  hashArquivo?: string;
  decisoesLinha?: DecisaoLinhaImportacao[];
  confirmacaoExplicita?: boolean;
  cienciaImportacaoParcial?: boolean;
  linhasIgnoradas?: number[];
};

export function parseCorpoPreviewConfirmarImportacao(body: unknown): CorpoPreviewConfirmarImportacao | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const origem = typeof record.origem === "string" ? record.origem : "";
  const arquivo = typeof record.arquivo === "string" ? record.arquivo : undefined;
  const conteudo = typeof record.conteudo === "string" ? record.conteudo : undefined;
  const processoId = typeof record.processoId === "string" ? record.processoId : undefined;
  const hashArquivo = typeof record.hashArquivo === "string" ? record.hashArquivo : undefined;
  const decisoesRaw = record.decisoesLinha;
  const decisoesLinha = Array.isArray(decisoesRaw)
    ? decisoesRaw
        .filter(
          (item): item is { linha: number; acao: string; motivo?: string } =>
            Boolean(item && typeof item === "object" && typeof (item as { linha?: unknown }).linha === "number"),
        )
        .map((item) => ({
          linha: item.linha,
          acao: parseAcaoConflito(item.acao),
          motivo: typeof item.motivo === "string" ? item.motivo : undefined,
        }))
    : undefined;
  const confirmacaoExplicita = record.confirmacaoExplicita === true ? true : undefined;
  const cienciaImportacaoParcial = record.cienciaImportacaoParcial === true ? true : undefined;
  const linhasIgnoradas = Array.isArray(record.linhasIgnoradas)
    ? record.linhasIgnoradas.filter((item): item is number => typeof item === "number" && Number.isFinite(item))
    : undefined;
  return {
    origem,
    arquivo,
    conteudo,
    processoId,
    hashArquivo,
    decisoesLinha,
    confirmacaoExplicita,
    cienciaImportacaoParcial,
    linhasIgnoradas,
  };
}

export function parseCorpoPreviewImportacao(body: unknown): Omit<CorpoPreviewConfirmarImportacao, "decisoesLinha" | "confirmacaoExplicita" | "cienciaImportacaoParcial" | "linhasIgnoradas"> | null {
  const parsed = parseCorpoPreviewConfirmarImportacao(body);
  if (!parsed) return null;
  return {
    origem: parsed.origem,
    arquivo: parsed.arquivo,
    conteudo: parsed.conteudo,
    processoId: parsed.processoId,
    hashArquivo: parsed.hashArquivo,
  };
}
