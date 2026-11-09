import { criarInconsistencia } from "@/lib/importacao-centro/motor-validacao/registro";
import type { InconsistenciaValidacao } from "@/lib/importacao-centro/motor-validacao/types";
import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import type { ResultadoNormalizacao } from "@/lib/importacao-centro/normalizacao-resultado";

/** Converte resultados de normalização em inconsistências (antes das regras de negócio). */
export function inconsistenciasDeNormalizacao(
  campos: Record<string, ResultadoNormalizacao<unknown>> | undefined,
): InconsistenciaValidacao[] {
  if (!campos) return [];
  const itens: InconsistenciaValidacao[] = [];
  for (const [campo, resultado] of Object.entries(campos)) {
    if (resultado.erro) {
      itens.push(
        criarInconsistencia({
          categoria: "cadastral",
          severidade: resultado.vazio ? "erro" : "atencao",
          codigo: "normalizacao.interpretacao_rejeitada",
          mensagem: `Campo "${campo}" não pôde ser interpretado: ${resultado.erro}`,
          campo,
        }),
      );
      continue;
    }
    if (resultado.ambiguo) {
      itens.push(
        criarInconsistencia({
          categoria: "cadastral",
          severidade: "atencao",
          codigo: "normalizacao.campo_ambiguo",
          mensagem: `Campo "${campo}" tem interpretação ambígua; conferir original "${resultado.original}".`,
          campo,
        }),
      );
    }
  }
  return itens;
}

export function valorOriginalColunaPlanilha(
  dadosOriginais: Record<string, string>,
  ...aliases: string[]
): string {
  for (const alias of aliases) {
    const chave = normalizarCabecalhoPlanilha(alias);
    if (chave in dadosOriginais) return dadosOriginais[chave] ?? "";
    if (alias in dadosOriginais) return dadosOriginais[alias] ?? "";
  }
  return "";
}
