import { normalizarValorMonetarioImportacao } from "@/lib/importacao-centro/normalizacao-campos";
import type { InconsistenciaValidacao } from "@/lib/importacao-centro/motor-validacao/types";
import { criarInconsistencia } from "@/lib/importacao-centro/motor-validacao/registro";

export const FORMATO_IMPORTACAO_RELATORIO_INADIMPLENCIA_GESTAO_V1 = "relatorio-inadimplencia-gestao-v1";

export const CABECALHO_MATRIZ_RELATORIO_INADIMPLENCIA = [
  "Condomínio",
  "Unidade",
  "Responsável",
  "Categoria",
  "Referência",
  "Vencimento",
  "Valor original",
  "Juros",
  "Multa",
  "Correção",
  "Total",
  "Página",
  "Linha relatório",
  "Interpretação segura",
] as const;

export type LinhaRelatorioInadimplencia = {
  pagina: number;
  linhaRelatorio: number;
  condominioNome: string;
  unidade: string;
  responsavel: string;
  categoria: string;
  referencia: string;
  vencimento: string;
  valorOriginal: string;
  juros: string;
  multa: string;
  correcao: string;
  total: string;
  interpretacaoSegura: boolean;
};

export type SubtotalUnidadeRelatorio = {
  unidade: string;
  pagina: number;
  valorOriginal: string;
  juros: string;
  multa: string;
  correcao: string;
  total: string;
};

export type TotaisGeraisRelatorio = {
  valorOriginal: string;
  total: string;
};

export type ResultadoInterpretacaoRelatorioInadimplencia = {
  formato: typeof FORMATO_IMPORTACAO_RELATORIO_INADIMPLENCIA_GESTAO_V1;
  condominioNome: string;
  linhas: LinhaRelatorioInadimplencia[];
  subtotaisUnidade: SubtotalUnidadeRelatorio[];
  totaisGerais?: TotaisGeraisRelatorio;
  paginas: number;
  inconsistencias: InconsistenciaValidacao[];
  matriz: string[][];
};

const REGEX_PAGINA = /Pág:\s*(\d+)\s*\/\s*(\d+)/i;
const REGEX_CONDOMINIO = /Condomínio\s+(.+?)(?:\s+Data Base:.*)?$/i;
/** Código de unidade no relatório Daniel Jorge / Gestão (ex.: MB-0102, A-0104, B-0501). */
const REGEX_CODIGO_UNIDADE_RELATORIO = "[A-Z]{1,3}-\\d{3,5}";
const REGEX_UNIDADE = new RegExp(`^\\s*(${REGEX_CODIGO_UNIDADE_RELATORIO})\\s*$`, "i");
const REGEX_UNIDADE_COM_RESPONSAVEL = new RegExp(
  `^Unidade:\\s*(${REGEX_CODIGO_UNIDADE_RELATORIO})\\s*(?:[—–-]\\s*(.+)|\\s*-\\s*(.+))?`,
  "i",
);
const REGEX_DEBITO =
  /^(.+?)\s+(\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s*$/;

const REGEX_TOTAL_DETALHADO =
  /^Total:\s*([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})/i;
/** TOTAL GERAL ACUMULADO (layout Daniel Jorge / Solar) — 5 colunas monetárias. */
const REGEX_TOTAL_GERAL_ACUMULADO =
  /TOTAL\s+GERAL\s+ACUMULADO\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})/i;

function categoriaDebitoReconhecida(categoria: string): boolean {
  const c = categoria.trim().toLocaleUpperCase("pt-BR");
  return (
    c.startsWith("TAXA") ||
    c.startsWith("ACORDO") ||
    c.startsWith("MULTA") ||
    c.startsWith("SERVI") ||
    c.startsWith("SERVIÇO") ||
    c.startsWith("OBRA") ||
    c.startsWith("RESERVA") ||
    c.startsWith("FUNDO") ||
    c.startsWith("CONSUMO") ||
    c.startsWith("RATEIO")
  );
}

function normalizarLinhaLayout(linha: string): string {
  return linha
    .replace(/\t+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
const REGEX_SUBTOTAL =
  /Total\s+'([^']+)':\s*([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})\s+([\d.]+,\d{2})/i;
const REGEX_TOTAL_GERAL = /([\d.]+,\d{2})\s+([\d.]+,\d{2})\s*$/;

function normalizarMoedaRelatorio(raw: string): { valor?: string; seguro: boolean } {
  const resultado = normalizarValorMonetarioImportacao(raw.replace(/\s/g, ""), { obrigatorio: true });
  if (resultado.erro || !resultado.normalizado) {
    return { seguro: false };
  }
  return { valor: resultado.normalizado, seguro: !resultado.ambiguo && !resultado.erro };
}

function somaValores(linhas: LinhaRelatorioInadimplencia[], campo: keyof Pick<
  LinhaRelatorioInadimplencia,
  "valorOriginal" | "juros" | "multa" | "correcao" | "total"
>): number {
  return linhas.reduce((acc, linha) => {
    const n = Number(linha[campo]);
    return acc + (Number.isFinite(n) ? n : 0);
  }, 0);
}

function divergenciaMonetaria(a: number, b: number, tolerancia = 0.05): boolean {
  return Math.abs(a - b) > tolerancia;
}

export function interpretarTextoRelatorioInadimplenciaGestao(textoBruto: string): ResultadoInterpretacaoRelatorioInadimplencia {
  const linhasTexto = textoBruto.split(/\r?\n/);
  const inconsistencias: InconsistenciaValidacao[] = [];
  const registros: LinhaRelatorioInadimplencia[] = [];
  const subtotais: SubtotalUnidadeRelatorio[] = [];

  let paginaAtual = 1;
  let paginas = 1;
  let condominioNome = "";
  let unidadeAtual = "";
  let responsavelAtual = "";
  let linhaRelatorio = 0;
  let totaisGerais: TotaisGeraisRelatorio | undefined;

  for (const linhaBruta of linhasTexto) {
    const linha = linhaBruta.trimEnd();
    if (!linha.trim()) continue;
    const compacta = normalizarLinhaLayout(linha);

    const pagina = compacta.match(REGEX_PAGINA);
    if (pagina) {
      paginaAtual = Number(pagina[1]);
      paginas = Number(pagina[2]);
      continue;
    }

    const cond = compacta.match(REGEX_CONDOMINIO);
    if (cond && !linha.includes("Corporate")) {
      condominioNome = cond[1].trim();
      continue;
    }

    const subtotal = compacta.match(REGEX_SUBTOTAL);
    if (subtotal) {
      const [, unidade, valor, juros, multa, correcao, total] = subtotal;
      const vo = normalizarMoedaRelatorio(valor);
      const ju = normalizarMoedaRelatorio(juros);
      const mu = normalizarMoedaRelatorio(multa);
      const co = normalizarMoedaRelatorio(correcao);
      const to = normalizarMoedaRelatorio(total);
      subtotais.push({
        unidade,
        pagina: paginaAtual,
        valorOriginal: vo.valor ?? "",
        juros: ju.valor ?? "",
        multa: mu.valor ?? "",
        correcao: co.valor ?? "",
        total: to.valor ?? "",
      });
      continue;
    }

    const unidadeComResponsavel = compacta.match(REGEX_UNIDADE_COM_RESPONSAVEL);
    if (unidadeComResponsavel) {
      unidadeAtual = unidadeComResponsavel[1].toUpperCase();
      responsavelAtual = (unidadeComResponsavel[2] ?? unidadeComResponsavel[3] ?? "").trim();
      continue;
    }

    const unidade = compacta.match(REGEX_UNIDADE);
    if (unidade) {
      unidadeAtual = unidade[1];
      responsavelAtual = "";
      continue;
    }

    const totalGeralAcumulado = compacta.match(REGEX_TOTAL_GERAL_ACUMULADO);
    if (totalGeralAcumulado) {
      const vo = normalizarMoedaRelatorio(totalGeralAcumulado[1]);
      const to = normalizarMoedaRelatorio(totalGeralAcumulado[5]);
      if (vo.valor && to.valor) {
        totaisGerais = { valorOriginal: vo.valor, total: to.valor };
      }
      continue;
    }

    const totalDetalhado = compacta.match(REGEX_TOTAL_DETALHADO);
    if (totalDetalhado) {
      const vo = normalizarMoedaRelatorio(totalDetalhado[1]);
      const to = normalizarMoedaRelatorio(totalDetalhado[5]);
      if (vo.valor && to.valor) {
        totaisGerais = { valorOriginal: vo.valor, total: to.valor };
      }
      continue;
    }

    const debito = compacta.match(REGEX_DEBITO);
    if (debito && unidadeAtual && categoriaDebitoReconhecida(debito[1])) {
      linhaRelatorio += 1;
      const [, categoria, referencia, vencimento, valor, juros, multa, correcao, total] = debito;
      const vo = normalizarMoedaRelatorio(valor);
      const ju = normalizarMoedaRelatorio(juros);
      const mu = normalizarMoedaRelatorio(multa);
      const co = normalizarMoedaRelatorio(correcao);
      const to = normalizarMoedaRelatorio(total);
      const interpretacaoSegura =
        Boolean(vo.valor && ju.valor && mu.valor && co.valor && to.valor) &&
        vo.seguro &&
        ju.seguro &&
        mu.seguro &&
        co.seguro &&
        to.seguro;

      if (!interpretacaoSegura) {
        inconsistencias.push(
          criarInconsistencia({
            categoria: "financeira",
            severidade: "atencao",
            codigo: "financeira.interpretacao_insegura",
            mensagem: `Linha ${linhaRelatorio} (unidade ${unidadeAtual}): valores não interpretados com segurança.`,
            campo: "valorAtualizado",
          }),
        );
      }

      registros.push({
        pagina: paginaAtual,
        linhaRelatorio,
        condominioNome: condominioNome || "—",
        unidade: unidadeAtual,
        responsavel: responsavelAtual,
        categoria: categoria.trim(),
        referencia,
        vencimento,
        valorOriginal: vo.valor ?? "",
        juros: ju.valor ?? "",
        multa: mu.valor ?? "",
        correcao: co.valor ?? "",
        total: to.valor ?? "",
        interpretacaoSegura,
      });
      continue;
    }

    if (
      unidadeAtual &&
      !responsavelAtual &&
      !categoriaDebitoReconhecida(compacta) &&
      !compacta.includes("Total") &&
      !compacta.includes("Logo") &&
      !compacta.includes("UNIDADES") &&
      !compacta.includes("Mês Ref") &&
      !/M[eê]s\s*Ref/i.test(compacta) &&
      !compacta.includes("Mês:") &&
      !compacta.includes("Proj. Rec") &&
      !compacta.includes("Correção:") &&
      !compacta.includes("Juros:") &&
      !compacta.includes("Data Base") &&
      !compacta.includes("Condomínio") &&
      !compacta.includes("Inadimplência") &&
      !REGEX_PAGINA.test(compacta) &&
      !REGEX_DEBITO.test(compacta) &&
      !/\d{2}\/\d{4}/.test(compacta) &&
      compacta.length > 2 &&
      compacta.length < 120
    ) {
      responsavelAtual = compacta;
    }
  }

  if (!totaisGerais) {
    const resumoAcumulado = [...linhasTexto]
      .reverse()
      .map((item) => normalizarLinhaLayout(item))
      .find((item) => REGEX_TOTAL_GERAL_ACUMULADO.test(item));
    if (resumoAcumulado) {
      const match = resumoAcumulado.match(REGEX_TOTAL_GERAL_ACUMULADO);
      if (match) {
        const vo = normalizarMoedaRelatorio(match[1]);
        const to = normalizarMoedaRelatorio(match[5]);
        if (vo.valor && to.valor) {
          totaisGerais = { valorOriginal: vo.valor, total: to.valor };
        }
      }
    }
  }

  if (!totaisGerais) {
    const resumoFinal = [...linhasTexto]
      .reverse()
      .map((item) => normalizarLinhaLayout(item))
      .find(
        (item) =>
          /^Total(\s|:)/i.test(item) &&
          REGEX_TOTAL_GERAL.test(item) &&
          item.includes(",") &&
          !/Total\s+'/i.test(item) &&
          !/Total\s+de\s+/i.test(item) &&
          !/Total\s+Lan[cç]/i.test(item),
      );
    if (resumoFinal) {
      const match = resumoFinal.match(REGEX_TOTAL_GERAL);
      if (match) {
        const vo = normalizarMoedaRelatorio(match[1]);
        const to = normalizarMoedaRelatorio(match[2]);
        if (vo.valor && to.valor) {
          totaisGerais = { valorOriginal: vo.valor, total: to.valor };
        }
      }
    }
  }

  for (const sub of subtotais) {
    const debitosUnidade = registros.filter((item) => item.unidade === sub.unidade);
    if (debitosUnidade.length === 0) continue;
    const soma = {
      valorOriginal: somaValores(debitosUnidade, "valorOriginal"),
      juros: somaValores(debitosUnidade, "juros"),
      multa: somaValores(debitosUnidade, "multa"),
      correcao: somaValores(debitosUnidade, "correcao"),
      total: somaValores(debitosUnidade, "total"),
    };
    const esperado = {
      valorOriginal: Number(sub.valorOriginal),
      juros: Number(sub.juros),
      multa: Number(sub.multa),
      correcao: Number(sub.correcao),
      total: Number(sub.total),
    };
    if (
      divergenciaMonetaria(soma.valorOriginal, esperado.valorOriginal) ||
      divergenciaMonetaria(soma.juros, esperado.juros) ||
      divergenciaMonetaria(soma.multa, esperado.multa) ||
      divergenciaMonetaria(soma.correcao, esperado.correcao) ||
      divergenciaMonetaria(soma.total, esperado.total)
    ) {
      inconsistencias.push(
        criarInconsistencia({
          categoria: "financeira",
          severidade: "atencao",
          codigo: "financeira.subtotal_unidade_divergente",
          mensagem: `Subtotal da unidade ${sub.unidade} (pág. ${sub.pagina}) difere da soma das linhas extraídas.`,
          campo: "valorAtualizado",
        }),
      );
    }
  }

  if (totaisGerais) {
    const somaGeralOriginal = somaValores(registros, "valorOriginal");
    const somaGeralTotal = somaValores(registros, "total");
    if (
      divergenciaMonetaria(somaGeralOriginal, Number(totaisGerais.valorOriginal)) ||
      divergenciaMonetaria(somaGeralTotal, Number(totaisGerais.total))
    ) {
      inconsistencias.push(
        criarInconsistencia({
          categoria: "financeira",
          severidade: "atencao",
          codigo: "financeira.total_geral_divergente",
          mensagem: "Total geral do relatório difere da soma dos registros extraídos.",
          campo: "valorAtualizado",
        }),
      );
    }
  }

  if (!condominioNome) {
    inconsistencias.push(
      criarInconsistencia({
        categoria: "estrutural",
        severidade: "erro",
        codigo: "estrutural.condominio_ausente",
        mensagem: "Não foi possível identificar o condomínio no relatório.",
      }),
    );
  }

  if (registros.length === 0) {
    inconsistencias.push(
      criarInconsistencia({
        categoria: "estrutural",
        severidade: "erro",
        codigo: "estrutural.sem_registros",
        mensagem: "Nenhum débito foi extraído do relatório.",
      }),
    );
  }

  const matriz: string[][] = [CABECALHO_MATRIZ_RELATORIO_INADIMPLENCIA as unknown as string[]];
  for (const registro of registros) {
    matriz.push([
      registro.condominioNome,
      registro.unidade,
      registro.responsavel,
      registro.categoria,
      registro.referencia,
      registro.vencimento,
      registro.valorOriginal,
      registro.juros,
      registro.multa,
      registro.correcao,
      registro.total,
      String(registro.pagina),
      String(registro.linhaRelatorio),
      registro.interpretacaoSegura ? "sim" : "nao",
    ]);
  }

  return {
    formato: FORMATO_IMPORTACAO_RELATORIO_INADIMPLENCIA_GESTAO_V1,
    condominioNome,
    linhas: registros,
    subtotaisUnidade: subtotais,
    totaisGerais,
    paginas,
    inconsistencias,
    matriz,
  };
}

export function textoPareceRelatorioInadimplenciaGestao(texto: string): boolean {
  const t = texto.trim();
  if (!t.includes("UNIDADES INADIMPLENTES")) return false;
  if (t.includes("Gestão Condominial") || t.includes("Condomínio21")) return true;
  if (/Gestão\s+e\s+Cobrança\s+Condominial/i.test(t)) return true;
  if (new RegExp(`Unidade:\\s*${REGEX_CODIGO_UNIDADE_RELATORIO}`, "i").test(t) && /Proj\.\s*Rec/i.test(t)) {
    return true;
  }
  return false;
}
