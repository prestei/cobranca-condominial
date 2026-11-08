import { normalizarNomeImportacao, normalizarCodigoIdentificacaoImportacao } from "@/lib/importacao-centro/normalizacao-campos";

export function chaveIdentificadorExterno(identificador: string): string | null {
  const norm = normalizarCodigoIdentificacaoImportacao(identificador);
  if (norm.vazio || !norm.normalizado) return null;
  return norm.normalizado.toLocaleLowerCase("pt-BR");
}

export function chaveNomeNormalizado(nome: string): string | null {
  const norm = normalizarNomeImportacao(nome);
  if (norm.vazio || !norm.normalizado) return null;
  return norm.normalizado.toLocaleLowerCase("pt-BR");
}

export function chaveDocumentoResponsavel(documento: string): string | null {
  const digits = documento.replace(/\D/g, "");
  if (digits.length < 11) return null;
  return digits;
}
