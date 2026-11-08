type EntradaLogImportacao = {
  codigo: string;
  processoId?: string;
  modulo?: string;
  nomeArquivo?: string;
  detalhe?: string;
};

/** Registro técnico sem conteúdo do arquivo nem PII. */
export function registrarErroTecnicoImportacao(entrada: EntradaLogImportacao) {
  const payload = {
    evento: "importacao_arquivo",
    ...entrada,
    quando: new Date().toISOString(),
  };
  console.error(JSON.stringify(payload));
}
