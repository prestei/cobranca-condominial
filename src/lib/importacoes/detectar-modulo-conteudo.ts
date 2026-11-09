import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";
import type { MetadadosRelatorioInadimplenciaLido } from "@/lib/importacoes/ler-conteudo-arquivo";
import type { ModuloImportacaoArquivo } from "@/lib/importacoes/limites";

const ROTULO_MODULO: Record<ModuloImportacaoArquivo, string> = {
  debitos: "inadimplência (débitos)",
  condominios: "condomínios",
  unidades: "unidades",
  responsaveis: "responsáveis",
};

export function rotuloModuloImportacao(modulo: ModuloImportacaoArquivo): string {
  return ROTULO_MODULO[modulo];
}

function cabecalhosMatriz(matriz: string[][]): string[] {
  if (!matriz[0]?.length) return [];
  return matriz[0].map((celula) => normalizarCabecalhoPlanilha(celula ?? ""));
}

function tem(...valores: string[]) {
  const set = new Set(valores);
  return (cols: string[]) => cols.some((c) => set.has(c));
}

const temUnidade = tem("unidade", "identificacao", "identificação");
const temCondominio = tem(
  "condominio",
  "condomínio",
  "condominio id",
  "identificador condominio",
  "identificador condomínio",
);
const temReferencia = tem("referencia", "referência");
const temVencimento = tem("vencimento", "data vencimento");
const temValor = tem("valor", "valor atualizado", "total", "valor original");
const temNome = tem("nome");
const temAdvogados = tem("advogados", "advogado");
const temTipoUnidade = tem("tipo");
const temCpf = tem("cpf", "cpf cnpj", "cpf/cnpj", "documento");
const temResponsavel = tem("responsavel", "responsável");

/**
 * Infere o módulo real pelo conteúdo já lido (matriz / metadados de PDF).
 * Relatório de inadimplência (PDF ou planilha completa) → sempre `debitos`,
 * que por sua vez provisiona condomínio, unidade e responsável nos cadastros certos.
 */
export function detectarModuloImportacaoPorConteudo(input: {
  moduloSolicitado: ModuloImportacaoArquivo;
  matriz?: string[][];
  metadadosRelatorio?: MetadadosRelatorioInadimplenciaLido;
}): ModuloImportacaoArquivo {
  if (input.metadadosRelatorio?.tipo) {
    return "debitos";
  }

  const cols = cabecalhosMatriz(input.matriz ?? []);
  if (cols.length === 0) return input.moduloSolicitado;

  const pareceDebitos =
    temUnidade(cols) &&
    temCondominio(cols) &&
    temReferencia(cols) &&
    temVencimento(cols) &&
    temValor(cols);
  if (pareceDebitos) return "debitos";

  const pareceResponsaveis = temUnidade(cols) && temCondominio(cols) && temNome(cols) && temCpf(cols);
  if (pareceResponsaveis) return "responsaveis";

  const pareceUnidades = temUnidade(cols) && temCondominio(cols) && temTipoUnidade(cols) && !temReferencia(cols);
  if (pareceUnidades) return "unidades";

  const pareceCondominios =
    temNome(cols) &&
    (temAdvogados(cols) || cols.includes("identificador externo") || cols.includes("administradora")) &&
    !temUnidade(cols);
  if (pareceCondominios) return "condominios";

  // Planilha de inadimplência às vezes traz Responsável sem todas as colunas mínimas
  // ainda assim, se tem unidade+condomínio+valores, trata como débitos.
  if (temUnidade(cols) && temCondominio(cols) && temValor(cols) && (temResponsavel(cols) || temReferencia(cols))) {
    return "debitos";
  }

  return input.moduloSolicitado;
}

export function mensagemModuloCorrigido(
  solicitado: ModuloImportacaoArquivo,
  efetivo: ModuloImportacaoArquivo,
): string | undefined {
  if (solicitado === efetivo) return undefined;
  return `O arquivo parece ser de ${rotuloModuloImportacao(efetivo)}. Vamos importar nesse destino — condomínio, unidade, responsável e débitos vão cada um para o cadastro certo.`;
}
