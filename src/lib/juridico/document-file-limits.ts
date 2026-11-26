/** Limite por arquivo anexado ao encaminhamento jurídico (compartilhado com UI). */
export const LEGAL_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

const EXTENSOES_PERMITIDAS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".txt",
  ".zip",
]);

function extensaoDoNome(nomeArquivo: string): string {
  const base = nomeArquivo.trim().split(/[/\\]/).pop() ?? "";
  const ponto = base.lastIndexOf(".");
  if (ponto <= 0) return "";
  return base.slice(ponto).toLowerCase();
}

export function validarArquivoJuridico(nomeArquivo: string, tamanhoBytes: number): string | null {
  if (tamanhoBytes <= 0) return "Arquivo vazio.";
  if (tamanhoBytes > LEGAL_DOCUMENT_MAX_BYTES) {
    return `O arquivo excede ${Math.round(LEGAL_DOCUMENT_MAX_BYTES / (1024 * 1024))} MiB.`;
  }
  const ext = extensaoDoNome(nomeArquivo);
  if (!ext || !EXTENSOES_PERMITIDAS.has(ext)) {
    return "Tipo de arquivo não permitido. Use PDF, Office, imagem ou ZIP.";
  }
  return null;
}