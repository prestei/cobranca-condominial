type EntradaLogImportacao = {
  codigo: string;
  processoId?: string;
  modulo?: string;
  detalhe?: string;
};

/** Registro técnico sem conteúdo do arquivo nem PII. */
export function registrarErroTecnicoImportacao(entrada: EntradaLogImportacao) {
  const payload = {
    evento: "importacao_arquivo",
    codigo: entrada.codigo,
    processoId: entrada.processoId,
    modulo: entrada.modulo,
    detalhe: entrada.detalhe,
    quando: new Date().toISOString(),
  };
  console.error(JSON.stringify(payload));
}
