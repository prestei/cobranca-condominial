import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import type { InconsistenciaValidacao } from "@/lib/importacao-centro/motor-validacao/types";

export function extrairCabecalhoNormalizado(matriz: string[][]): string[] {
  if (matriz.length === 0) return [];
  return matriz[0].map(normalizarCabecalhoPlanilha);
}

export function montarDadosOriginaisLinha(cabecalho: string[], linhaBruta: string[]): Record<string, string> {
  const dados: Record<string, string> = {};
  const tamanho = Math.max(cabecalho.length, linhaBruta.length);
  for (let i = 0; i < tamanho; i += 1) {
    const chave = cabecalho[i] || `coluna_${i + 1}`;
    dados[chave] = linhaBruta[i] ?? "";
  }
  return dados;
}

export function validarCabecalhoEstrutural(params: {
  cabecalho: string[];
  colunasReconhecidas: ReadonlySet<string>;
  colunasObrigatorias: readonly string[];
}): InconsistenciaValidacao[] {
  const inconsistencias: InconsistenciaValidacao[] = [];
  const vistos = new Map<string, number>();

  for (const coluna of params.cabecalho) {
    if (!coluna) continue;
    vistos.set(coluna, (vistos.get(coluna) ?? 0) + 1);
    if (!params.colunasReconhecidas.has(coluna)) {
      inconsistencias.push({
        categoria: "estrutural",
        severidade: "atencao",
        codigo: "estrutural.coluna_desconhecida",
        mensagem: `Coluna desconhecida no cabeçalho: "${coluna}".`,
        campo: coluna,
      });
    }
  }

  for (const [coluna, quantidade] of vistos) {
    if (quantidade > 1) {
      inconsistencias.push({
        categoria: "estrutural",
        severidade: "erro",
        codigo: "estrutural.coluna_duplicada",
        mensagem: `Coluna duplicada no cabeçalho: "${coluna}".`,
        campo: coluna,
      });
    }
  }

  const presentes = new Set(params.cabecalho.filter(Boolean));
  for (const obrigatoria of params.colunasObrigatorias) {
    const normalizada = normalizarCabecalhoPlanilha(obrigatoria);
    if (!presentes.has(normalizada)) {
      inconsistencias.push({
        categoria: "estrutural",
        severidade: "erro",
        codigo: "estrutural.campo_obrigatorio_ausente",
        mensagem: `Coluna obrigatória ausente: "${obrigatoria}".`,
        campo: obrigatoria,
      });
    }
  }

  return inconsistencias;
}
