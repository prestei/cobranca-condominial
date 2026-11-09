/** Limites de processamento de arquivos de importação (Fase 2 — recebimento). */
export const LIMITES_ARQUIVO_IMPORTACAO = {
  /** 15 MiB — evita carregar relatórios enormes na memória do processo. */
  tamanhoMaximoBytes: 15 * 1024 * 1024,
  /** Folga para envelope multipart (nome, boundary) ao checar Content-Length. */
  folgaMultipartBytes: 1024 * 1024,
  /** Linhas de dados (exclui cabeçalho) após leitura estrutural. */
  registrosMaximos: 50_000,
  /** Processos temporários expiram após 1 hora. */
  retencaoTemporariaMs: 60 * 60 * 1000,
  /** Intervalo da limpeza automática em background. */
  intervaloLimpezaMs: 5 * 60 * 1000,
} as const;

export function mensagemTamanhoMaximoArquivo(): string {
  return `O arquivo excede o tamanho máximo de ${Math.round(LIMITES_ARQUIVO_IMPORTACAO.tamanhoMaximoBytes / (1024 * 1024))} MiB.`;
}

export function mensagemLimiteRegistros(): string {
  return `O arquivo excede o limite de ${LIMITES_ARQUIVO_IMPORTACAO.registrosMaximos.toLocaleString("pt-BR")} registros.`;
}

export function tamanhoRequisicaoExcedeLimite(contentLength: number): boolean {
  return (
    Number.isFinite(contentLength) &&
    contentLength > LIMITES_ARQUIVO_IMPORTACAO.tamanhoMaximoBytes + LIMITES_ARQUIVO_IMPORTACAO.folgaMultipartBytes
  );
}

export type ModuloImportacaoArquivo = "debitos" | "unidades" | "condominios" | "responsaveis";

export type FormatoArquivoImportacao = "csv" | "xlsx" | "xls-xml" | "pdf";

const extensoesPorFormato: Record<FormatoArquivoImportacao, readonly string[]> = {
  csv: [".csv", ".txt"],
  xlsx: [".xlsx"],
  "xls-xml": [".xls"],
  pdf: [".pdf"],
};

const mimesPorFormato: Record<FormatoArquivoImportacao, readonly string[]> = {
  csv: ["text/csv", "text/plain", "application/csv", "application/vnd.ms-excel"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  "xls-xml": ["application/vnd.ms-excel", "text/xml", "application/xml"],
  pdf: ["application/pdf"],
};

/**
 * Formatos que o módulo processa nativamente.
 * PDF de inadimplência pode ser enviado em qualquer módulo: o recebimento detecta o
 * conteúdo e redireciona para `debitos`, gravando condomínio/unidade/responsável/débito
 * cada um no cadastro certo.
 */
export const FORMATOS_AUTORIZADOS_POR_MODULO: Record<
  ModuloImportacaoArquivo,
  readonly FormatoArquivoImportacao[]
> = {
  debitos: ["csv", "xlsx", "xls-xml", "pdf"],
  unidades: ["csv", "xlsx", "xls-xml", "pdf"],
  condominios: ["csv", "xlsx", "xls-xml", "pdf"],
  responsaveis: ["csv", "xlsx", "xls-xml", "pdf"],
};

/** Qualquer formato conhecido de importação (independente do módulo escolhido na UI). */
export const FORMATOS_IMPORTACAO_CONHECIDOS: readonly FormatoArquivoImportacao[] = [
  "csv",
  "xlsx",
  "xls-xml",
  "pdf",
];

export function extensoesPermitidas(modulo: ModuloImportacaoArquivo): string[] {
  const formatos = FORMATOS_AUTORIZADOS_POR_MODULO[modulo];
  const extensoes = new Set<string>();
  for (const formato of formatos) {
    for (const ext of extensoesPorFormato[formato]) extensoes.add(ext);
  }
  return [...extensoes];
}

export function mimePermitidoParaFormato(formato: FormatoArquivoImportacao, mimeDeclarado: string): boolean {
  const mime = mimeDeclarado.split(";")[0]?.trim().toLowerCase() ?? "";
  if (!mime || mime === "application/octet-stream") return true;
  return mimesPorFormato[formato].includes(mime);
}

export function extensaoDoNome(nomeArquivo: string): string {
  const base = nomeArquivo.trim().split(/[/\\]/).pop() ?? "";
  const ponto = base.lastIndexOf(".");
  if (ponto <= 0) return "";
  return base.slice(ponto).toLowerCase();
}

export function formatoPorExtensao(ext: string, modulo: ModuloImportacaoArquivo): FormatoArquivoImportacao | null {
  const normalizada = ext.startsWith(".") ? ext : `.${ext}`;
  for (const formato of FORMATOS_AUTORIZADOS_POR_MODULO[modulo]) {
    if (extensoesPorFormato[formato].includes(normalizada)) return formato;
  }
  return null;
}

/** Aceita extensão de qualquer formato de importação (o servidor decide o módulo efetivo). */
export function formatoPorExtensaoConhecida(ext: string): FormatoArquivoImportacao | null {
  const normalizada = ext.startsWith(".") ? ext : `.${ext}`;
  for (const formato of FORMATOS_IMPORTACAO_CONHECIDOS) {
    if (extensoesPorFormato[formato].includes(normalizada)) return formato;
  }
  return null;
}
