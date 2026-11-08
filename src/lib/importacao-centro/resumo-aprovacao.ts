import type { InconsistenciaValidacao } from "@/lib/importacao-centro/motor-validacao/types";
import { politicaAprovacaoModuloImportacao } from "@/lib/importacao-centro/politica-aprovacao";
import {
  contarPreVisualizacao,
  indicadorLinhaPreVisualizacao,
  linhaSeraGravada,
  type ContagensPreVisualizacaoImportacao,
} from "@/lib/importacao-centro/pre-visualizacao";
import type { ContadoresImportacao, LinhaConferencia, PreviewImportacaoCentral } from "@/lib/importacao-centro/types";

export type TotalFinanceiroResumoAprovacao = {
  valor: string;
  moeda: "BRL";
};

export type ResumoAprovacaoImportacao = {
  moduloDestino: string;
  arquivo: string;
  origem: string;
  hashArquivo: string;
  quantidadeTotal: number;
  contagens: ContagensPreVisualizacaoImportacao;
  registrosValidos: number;
  registrosAtencao: number;
  registrosErro: number;
  seraoIgnorados: number;
  seraoAtualizados: number;
  seraoNovos: number;
  seraoGravados: number;
  exclusoesPorProblema: number;
  totalFinanceiro?: TotalFinanceiroResumoAprovacao;
  importacaoParcial: boolean;
  permitirImportacaoParcial: boolean;
  arquivoJaImportado: boolean;
  errosBloqueantes: string[];
  podeConfirmar: boolean;
  motivoBloqueio?: string;
  mensagemImpacto: string;
  contadoresConferencia: ContadoresImportacao;
};

function errosBloqueantesArquivo(inconsistencias: InconsistenciaValidacao[]): string[] {
  return [...new Set(inconsistencias.filter((item) => item.severidade === "erro").map((item) => item.mensagem))];
}

function somarValoresGravacaoDebitos(linhas: LinhaConferencia[], ignoradas?: ReadonlySet<number>): string | undefined {
  let total = 0;
  let algum = false;
  for (const item of linhas) {
    if (!linhaSeraGravada(item, ignoradas)) continue;
    const bruto = item.resumo?.valorAtualizado ?? item.resumo?.total ?? "";
    const numero = Number(String(bruto).replace(",", "."));
    if (!Number.isFinite(numero)) continue;
    total += numero;
    algum = true;
  }
  if (!algum) return undefined;
  return total.toFixed(2);
}

function contarIgnoradosConferencia(
  linhas: LinhaConferencia[],
  ignoradas: ReadonlySet<number> | undefined,
): number {
  let total = 0;
  for (const item of linhas) {
    if (ignoradas?.has(item.linha)) {
      total += 1;
      continue;
    }
    if (item.situacao === "duplicado" || item.situacao === "manual_protegido" || item.situacao === "ignorado") {
      total += 1;
    }
  }
  return total;
}

/** Linhas que não serão gravadas por erro, revisão ou decisão — duplicatas já na base não contam como parcial. */
function contarExclusoesPorProblema(
  linhas: LinhaConferencia[],
  ignoradas: ReadonlySet<number> | undefined,
): number {
  let total = 0;
  for (const item of linhas) {
    if (ignoradas?.has(item.linha)) {
      total += 1;
      continue;
    }
    if (item.situacao === "erro" || item.validacao?.resultado === "erro") {
      total += 1;
      continue;
    }
    if (
      item.situacao === "ignorado" ||
      item.situacao === "revisao" ||
      item.situacao === "manual_protegido"
    ) {
      total += 1;
    }
  }
  return total;
}

function contarNovosAtualizacoes(
  linhas: LinhaConferencia[],
  ignoradas: ReadonlySet<number> | undefined,
): { novos: number; atualizacoes: number } {
  let novos = 0;
  let atualizacoes = 0;
  for (const item of linhas) {
    if (!linhaSeraGravada(item, ignoradas)) continue;
    if (item.situacao === "novo") novos += 1;
    else if (item.situacao === "atualizacao") atualizacoes += 1;
  }
  return { novos, atualizacoes };
}

export function montarResumoAprovacaoImportacao(params: {
  moduloDestino: string;
  preview: Pick<
    PreviewImportacaoCentral,
    | "hashArquivo"
    | "arquivo"
    | "origem"
    | "quantidadeRegistros"
    | "contadores"
    | "arquivoJaImportado"
    | "linhas"
    | "inconsistenciasArquivo"
  >;
  linhasIgnoradas?: number[];
}): ResumoAprovacaoImportacao {
  const politica = politicaAprovacaoModuloImportacao(params.moduloDestino);
  const ignoradas = new Set(params.linhasIgnoradas ?? []);
  const contagens = contarPreVisualizacao(params.preview.linhas, ignoradas);
  const { novos, atualizacoes } = contarNovosAtualizacoes(params.preview.linhas, ignoradas);
  const seraoGravados = novos + atualizacoes;
  const seraoIgnorados = contarIgnoradosConferencia(params.preview.linhas, ignoradas);
  const exclusoesPorProblema = contarExclusoesPorProblema(params.preview.linhas, ignoradas);

  const errosArquivo = errosBloqueantesArquivo(params.preview.inconsistenciasArquivo ?? []);
  const errosBloqueantes = [...errosArquivo];

  const importacaoParcial =
    politica.permitirImportacaoParcial && seraoGravados > 0 && exclusoesPorProblema > 0;

  let totalFinanceiro: TotalFinanceiroResumoAprovacao | undefined;
  if (politica.suportaTotalFinanceiro && seraoGravados > 0) {
    const valor = somarValoresGravacaoDebitos(params.preview.linhas, ignoradas);
    if (valor) {
      totalFinanceiro = { valor, moeda: "BRL" };
    }
  }

  let podeConfirmar = false;
  let motivoBloqueio: string | undefined;

  if (errosBloqueantes.length > 0) {
    motivoBloqueio =
      errosBloqueantes.length === 1
        ? errosBloqueantes[0]
        : "O arquivo contém erros impeditivos que precisam ser corrigidos antes da gravação.";
  } else if (params.preview.arquivoJaImportado) {
    podeConfirmar = true;
  } else if (seraoGravados === 0 && seraoIgnorados > 0 && exclusoesPorProblema === 0) {
    podeConfirmar = true;
  } else if (seraoGravados === 0) {
    motivoBloqueio = "Nenhum registro será gravado. Corrija o arquivo ou cancele a importação.";
  } else if (!politica.permitirImportacaoParcial && exclusoesPorProblema > 0) {
    motivoBloqueio = "Este módulo não permite importação parcial; corrija todos os registros antes de confirmar.";
  } else {
    podeConfirmar = true;
  }

  const mensagemImpacto = params.preview.arquivoJaImportado
    ? "Este arquivo já foi importado. Uma nova confirmação não duplicará registros já gravados."
    : seraoGravados === 0 && seraoIgnorados > 0 && exclusoesPorProblema === 0
      ? "Todos os registros deste arquivo já existem na base. Você pode seguir para registrar a conferência sem gravar duplicatas."
      : importacaoParcial
      ? `${seraoGravados} registro(s) serão gravados; ${exclusoesPorProblema} ficarão de fora nesta operação por erro ou decisão de conferência.`
      : seraoIgnorados > 0
        ? `${seraoGravados} registro(s) serão gravados; ${seraoIgnorados} duplicado(s) ou já existente(s) serão ignorados.`
        : `${seraoGravados} registro(s) serão gravados no módulo de destino (${params.moduloDestino}).`;

  return {
    moduloDestino: params.moduloDestino,
    arquivo: params.preview.arquivo,
    origem: params.preview.origem,
    hashArquivo: params.preview.hashArquivo,
    quantidadeTotal: params.preview.quantidadeRegistros,
    contagens,
    registrosValidos: contagens.validos,
    registrosAtencao: contagens.atencao,
    registrosErro: contagens.erros,
    seraoIgnorados,
    seraoAtualizados: atualizacoes,
    seraoNovos: novos,
    seraoGravados,
    exclusoesPorProblema,
    totalFinanceiro,
    importacaoParcial,
    permitirImportacaoParcial: politica.permitirImportacaoParcial,
    arquivoJaImportado: params.preview.arquivoJaImportado,
    errosBloqueantes,
    podeConfirmar,
    motivoBloqueio,
    mensagemImpacto,
    contadoresConferencia: params.preview.contadores,
  };
}

export function linhasComErroImpeditivo(linhas: LinhaConferencia[]): number {
  return linhas.filter((item) => indicadorLinhaPreVisualizacao(item) === "erro").length;
}
