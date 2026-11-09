import { interpretarPdfInadimplencia } from "@/lib/importacoes/inadimplencia/pdf-para-matriz-inadimplencia";
import { LIMITES_ARQUIVO_IMPORTACAO, type FormatoArquivoImportacao } from "@/lib/importacoes/limites";
import { lerMatrizPlanilha, PlanilhaLimiteError } from "@/lib/planilha/ler-planilha";
import { lerMatrizXlsx } from "@/lib/planilha/ler-xlsx";
import { ZipMinimoError } from "@/lib/planilha/zip-minimo";

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

export async function lerConteudoPlanilha(
  buffer: Buffer,
  formato: FormatoArquivoImportacao,
): Promise<ConteudoPlanilhaLido> {
  if (formato === "pdf") {
    const relatorio = await interpretarPdfInadimplencia(buffer);
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
      const matriz = lerMatrizXlsx(buffer, LIMITES_ARQUIVO_IMPORTACAO.registrosMaximos);
      if (matriz.length === 0) {
        throw new LeituraArquivoImportacaoError("Arquivo vazio.", "arquivo_vazio");
      }
      return { formato, matriz, quantidadeRegistros: contarRegistros(matriz) };
    } catch (error) {
      if (error instanceof LeituraArquivoImportacaoError) throw error;
      if (error instanceof PlanilhaLimiteError) {
        throw new LeituraArquivoImportacaoError(
          `O arquivo excede o limite de ${LIMITES_ARQUIVO_IMPORTACAO.registrosMaximos.toLocaleString("pt-BR")} registros.`,
          "muitos_registros",
        );
      }
      if (error instanceof ZipMinimoError) {
        const macros = /macro/i.test(error.message);
        const protegido = /senha|protegido/i.test(error.message);
        throw new LeituraArquivoImportacaoError(
          macros
            ? error.message
            : protegido
              ? "Planilha protegida por senha ou que não pode ser lida. Envie uma versão desbloqueada."
              : error.message,
          macros || protegido ? "arquivo_protegido" : "arquivo_corrompido",
        );
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
    matriz = lerMatrizPlanilha(conteudoTexto, LIMITES_ARQUIVO_IMPORTACAO.registrosMaximos);
  } catch (error) {
    if (error instanceof PlanilhaLimiteError) {
      throw new LeituraArquivoImportacaoError(
        `O arquivo excede o limite de ${LIMITES_ARQUIVO_IMPORTACAO.registrosMaximos.toLocaleString("pt-BR")} registros.`,
        "muitos_registros",
      );
    }
    throw new LeituraArquivoImportacaoError("Arquivo corrompido ou ilegível.", "arquivo_corrompido");
  }

  if (matriz.length === 0 || !matriz.some((linha) => linha.some((celula) => celula.trim()))) {
    throw new LeituraArquivoImportacaoError("Arquivo vazio.", "arquivo_vazio");
  }

  return { formato, conteudoTexto, matriz, quantidadeRegistros: contarRegistros(matriz) };
}
