import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import { CODIGOS_VALIDACAO } from "@/lib/importacao-centro/motor-validacao/codigos";
import { criarInconsistencia } from "@/lib/importacao-centro/motor-validacao/registro";
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
      inconsistencias.push(
        criarInconsistencia({
          categoria: "estrutural",
          severidade: "atencao",
          codigo: CODIGOS_VALIDACAO.estrutural.colunaDesconhecida,
          mensagem: `Coluna desconhecida no cabeçalho: "${coluna}".`,
          campo: coluna,
        }),
      );
    }
  }

  for (const [coluna, quantidade] of vistos) {
    if (quantidade > 1) {
      inconsistencias.push(
        criarInconsistencia({
          categoria: "estrutural",
          severidade: "erro",
          codigo: CODIGOS_VALIDACAO.estrutural.colunaDuplicada,
          mensagem: `Coluna duplicada no cabeçalho: "${coluna}".`,
          campo: coluna,
        }),
      );
    }
  }

  const presentes = new Set(params.cabecalho.filter(Boolean));
  for (const obrigatoria of params.colunasObrigatorias) {
    const normalizada = normalizarCabecalhoPlanilha(obrigatoria);
    if (!presentes.has(normalizada)) {
      inconsistencias.push(
        criarInconsistencia({
          categoria: "estrutural",
          severidade: "erro",
          codigo: CODIGOS_VALIDACAO.estrutural.campoObrigatorioAusente,
          mensagem: `Coluna obrigatória ausente: "${obrigatoria}".`,
          campo: obrigatoria,
        }),
      );
    }
  }

  return inconsistencias;
}

export function inconsistenciaFormatoIncompativel(campo: string, mensagem: string): InconsistenciaValidacao {
  return criarInconsistencia({
    categoria: "estrutural",
    severidade: "erro",
    codigo: CODIGOS_VALIDACAO.estrutural.formatoIncompativel,
    mensagem,
    campo,
  });
}

export function inconsistenciaTipoDadoIncorreto(campo: string, mensagem: string): InconsistenciaValidacao {
  return criarInconsistencia({
    categoria: "estrutural",
    severidade: "erro",
    codigo: CODIGOS_VALIDACAO.estrutural.tipoDadoIncorreto,
    mensagem,
    campo,
  });
}
