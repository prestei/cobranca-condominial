import type { LinhaConferencia, LinhaParseada, SituacaoLinhaImportacao } from "@/lib/importacao-centro/types";

/**
 * Detecta linhas repetidas dentro do mesmo arquivo (antes da classificação na base).
 */
export function marcarDuplicidadesNoArquivo<TPayload>(
  parseadas: LinhaParseada<TPayload>[],
  chave: (payload: TPayload) => string,
): LinhaConferencia<TPayload>[] {
  const vistos = new Set<string>();
  const resultado: LinhaConferencia<TPayload>[] = [];

  for (const item of parseadas) {
    if (item.erro) {
      resultado.push({
        linha: item.linha,
        situacao: "erro",
        mensagem: item.erro,
        validacao: item.validacao,
      });
      continue;
    }
    if (!item.payload) continue;

    const chaveLinha = chave(item.payload);
    if (vistos.has(chaveLinha)) {
      resultado.push({
        linha: item.linha,
        situacao: "duplicado",
        mensagem: "Linha duplicada no mesmo arquivo.",
        payload: item.payload,
        validacao: item.validacao,
      });
      continue;
    }
    vistos.add(chaveLinha);
    resultado.push({
      linha: item.linha,
      situacao: "novo",
      payload: item.payload,
      validacao: item.validacao,
    });
  }

  return resultado;
}

export function contarPorSituacao(linhas: LinhaConferencia[]): Record<SituacaoLinhaImportacao, number> {
  const base: Record<SituacaoLinhaImportacao, number> = {
    novo: 0,
    atualizacao: 0,
    duplicado: 0,
    erro: 0,
    manual_protegido: 0,
    ignorado: 0,
    revisao: 0,
  };
  for (const linha of linhas) {
    base[linha.situacao] += 1;
  }
  return base;
}
