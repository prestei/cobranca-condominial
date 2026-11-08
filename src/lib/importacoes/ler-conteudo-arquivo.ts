import { interpretarPdfInadimplencia } from "@/lib/importacoes/inadimplencia/pdf-para-matriz-inadimplencia";
import { lerMatrizPlanilha } from "@/lib/planilha/ler-planilha";
import { lerMatrizXlsx } from "@/lib/planilha/ler-xlsx";
import { ZipMinimoError } from "@/lib/planilha/zip-minimo";
import type { FormatoArquivoImportacao } from "@/lib/importacoes/limites";

export class LeituraArquivoImportacaoError extends Error {
  constructor(
    message: string,
    readonly codigo: string,
  ) {
    super(message);
  }
}

export type MetadadosRelatorioInadimplenciaLido = {
  tipo: string;
  condominioNome: string;
  paginas: number;
  inconsistencias: import("@/lib/importacao-centro/motor-validacao/types").InconsistenciaValidacao[];
};

export type ConteudoPlanilhaLido = {
  formato: FormatoArquivoImportacao;
  conteudoTexto?: string;
  matriz: string[][];
  quantidadeRegistros: number;
  metadadosRelatorio?: MetadadosRelatorioInadimplenciaLido;
};

function decodificarTexto(buffer: Buffer): string {
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString("utf8");
  }
  return buffer.toString("utf8");
}

function contarRegistros(matriz: string[][]): number {
  if (matriz.length <= 1) return 0;
  let total = 0;
  for (let i = 1; i < matriz.length; i += 1) {
    if (matriz[i].some((celula) => celula.trim())) total += 1;
  }
  return total;
}

export function lerConteudoPlanilha(buffer: Buffer, formato: FormatoArquivoImportacao): ConteudoPlanilhaLido {
  if (formato === "pdf") {
    const relatorio = interpretarPdfInadimplencia(buffer);
    if (relatorio?.matriz.length) {
      return {
        formato,
        matriz: relatorio.matriz,
        quantidadeRegistros: contarRegistros(relatorio.matriz),
        metadadosRelatorio: {
          tipo: relatorio.formato,
          condominioNome: relatorio.condominioNome,
          paginas: relatorio.paginas,
          inconsistencias: relatorio.inconsistencias,
        },
      };
    }
    throw new LeituraArquivoImportacaoError(
      "Não foi possível extrair o relatório de inadimplência deste PDF. Envie CSV/Excel ou o relatório Gestão Condominial com texto selecionável.",
      "pdf_sem_texto",
    );
  }

  if (formato === "xlsx") {
    try {
      const matriz = lerMatrizXlsx(buffer);
      if (matriz.length === 0) {
        throw new LeituraArquivoImportacaoError("Arquivo vazio.", "arquivo_vazio");
      }
      return { formato, matriz, quantidadeRegistros: contarRegistros(matriz) };
    } catch (error) {
      if (error instanceof LeituraArquivoImportacaoError) throw error;
      if (error instanceof ZipMinimoError) {
        throw new LeituraArquivoImportacaoError(error.message, "arquivo_corrompido");
      }
      throw new LeituraArquivoImportacaoError("Arquivo Excel inválido ou corrompido.", "arquivo_corrompido");
    }
  }

  const conteudoTexto = decodificarTexto(buffer).replace(/^\uFEFF/, "");
  if (!conteudoTexto.trim()) {
    throw new LeituraArquivoImportacaoError("Arquivo vazio.", "arquivo_vazio");
  }

  let matriz: string[][];
  try {
    matriz = lerMatrizPlanilha(conteudoTexto);
  } catch {
    throw new LeituraArquivoImportacaoError("Arquivo corrompido ou ilegível.", "arquivo_corrompido");
  }

  if (matriz.length === 0 || !matriz.some((linha) => linha.some((celula) => celula.trim()))) {
    throw new LeituraArquivoImportacaoError("Arquivo vazio.", "arquivo_vazio");
  }

  return { formato, conteudoTexto, matriz, quantidadeRegistros: contarRegistros(matriz) };
}
