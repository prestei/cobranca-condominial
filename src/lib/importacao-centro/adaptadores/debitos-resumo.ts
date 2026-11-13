/** Funções puras de resumo para prévia de débitos — seguras no client (sem PostgreSQL). */

function celulaDadosOriginais(dados: Record<string, string>, ...chaves: string[]): string {
  for (const chave of chaves) {
    const valor = dados[chave]?.trim();
    if (valor && valor !== "—") return valor;
  }
  return "—";
}

/** Completa campos vazios ou "—" do resumo com os dados originais da linha. */
export function mesclarResumoLinhaImportacao(
  resumo?: Record<string, string> | null,
  dadosOriginais?: Record<string, string> | null,
): Record<string, string> {
  const resumoOriginais =
    dadosOriginais && Object.keys(dadosOriginais).length > 0
      ? montarResumoDebitoDeDadosOriginais(dadosOriginais)
      : null;
  if (!resumo && resumoOriginais) return resumoOriginais;
  if (!resumo || !resumoOriginais) return resumo ?? {};
  const mesclado = { ...resumoOriginais, ...resumo };
  for (const [chave, valorOriginal] of Object.entries(resumoOriginais)) {
    const atual = mesclado[chave]?.trim();
    if (!atual || atual === "—") {
      mesclado[chave] = valorOriginal;
    }
  }
  return mesclado;
}

/** Exibe valores do PDF/planilha na prévia mesmo quando o parse ainda não gerou payload. */
export function montarResumoDebitoDeDadosOriginais(dados: Record<string, string>): Record<string, string> {
  return {
    condominio: celulaDadosOriginais(dados, "condominio"),
    unidade: celulaDadosOriginais(dados, "unidade"),
    responsavel: celulaDadosOriginais(dados, "responsavel", "responsável"),
    categoria: celulaDadosOriginais(dados, "categoria", "descricao", "descrição"),
    referencia: celulaDadosOriginais(dados, "referencia", "referência"),
    vencimento: celulaDadosOriginais(dados, "vencimento", "data vencimento"),
    valorOriginal: celulaDadosOriginais(dados, "valor original", "valor"),
    juros: celulaDadosOriginais(dados, "juros"),
    multa: celulaDadosOriginais(dados, "multa"),
    correcao: celulaDadosOriginais(dados, "correcao", "correção"),
    total: celulaDadosOriginais(dados, "total", "valor atualizado"),
    valorAtualizado: celulaDadosOriginais(dados, "total", "valor atualizado"),
  };
}
