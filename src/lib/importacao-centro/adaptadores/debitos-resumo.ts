/** Funções puras de resumo para prévia de débitos — seguras no client (sem PostgreSQL). */

function celulaDadosOriginais(dados: Record<string, string>, ...chaves: string[]): string {
  for (const chave of chaves) {
    const valor = dados[chave]?.trim();
    if (valor && valor !== "—") return valor;
  }
  return "—";
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
