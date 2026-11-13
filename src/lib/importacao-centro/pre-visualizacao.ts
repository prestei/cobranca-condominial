import { situacaoParaAcaoConflito } from "@/lib/importacao-centro/detecao-duplicidades/aplicar-decisoes";
import type { AcaoConflitoImportacao } from "@/lib/importacao-centro/detecao-duplicidades/types";
import type { LinhaConferencia, SituacaoLinhaImportacao } from "@/lib/importacao-centro/types";
import type { RegistroValidadoImportacao, ResultadoValidacaoImportacao } from "@/lib/importacao-centro/motor-validacao/types";

/** Indicador visual da linha (Ticket 07). */
export type IndicadorPreVisualizacaoImportacao = "valido" | "atencao" | "erro";

export type ContagensPreVisualizacaoImportacao = {
  validos: number;
  atencao: number;
  erros: number;
  duplicidades: number;
};

export function situacaoPermiteIgnorar(situacao: SituacaoLinhaImportacao): boolean {
  return situacao === "duplicado" || situacao === "manual_protegido" || situacao === "atualizacao" || situacao === "novo";
}

export function situacaoPermiteIgnorarNaPrevia(situacao: SituacaoLinhaImportacao, ignoradoLocal?: boolean): boolean {
  if (ignoradoLocal) return true;
  return situacao === "duplicado" || situacao === "manual_protegido";
}

export function indicadorLinhaPreVisualizacao(
  item: Pick<LinhaConferencia, "situacao" | "validacao">,
): IndicadorPreVisualizacaoImportacao {
  if (item.situacao === "erro") return "erro";
  const motor: ResultadoValidacaoImportacao | undefined = item.validacao?.resultado;
  if (motor === "erro") return "erro";
  if (item.situacao === "duplicado" && motor === "valido") return "valido";
  if (
    item.situacao === "duplicado" ||
    item.situacao === "manual_protegido" ||
    item.situacao === "revisao" ||
    motor === "atencao"
  ) {
    return "atencao";
  }
  if (item.situacao === "ignorado") return "atencao";
  return "valido";
}

export function contarPreVisualizacao(
  linhas: Array<Pick<LinhaConferencia, "linha" | "situacao" | "validacao">>,
  linhasIgnoradas?: ReadonlySet<number>,
): ContagensPreVisualizacaoImportacao {
  let validos = 0;
  let atencao = 0;
  let erros = 0;
  let duplicidades = 0;

  for (const item of linhas) {
    if (linhasIgnoradas?.has(item.linha)) continue;
    const indicador = indicadorLinhaPreVisualizacao(item);
    if (item.situacao === "duplicado") duplicidades += 1;
    if (indicador === "erro") erros += 1;
    else if (indicador === "atencao") atencao += 1;
    else validos += 1;
  }

  return { validos, atencao, erros, duplicidades };
}

export function situacaoEfetivaPreVisualizacao(
  item: Pick<LinhaConferencia, "linha" | "situacao">,
  opts?: {
    linhasIgnoradas?: ReadonlySet<number>;
    decisoes?: ReadonlyMap<number, AcaoConflitoImportacao>;
  },
): SituacaoLinhaImportacao {
  if (opts?.linhasIgnoradas?.has(item.linha)) return "ignorado";
  const decisao = opts?.decisoes?.get(item.linha);
  if (decisao) return situacaoParaAcaoConflito(decisao);
  return item.situacao;
}

export function linhaSeraGravada(
  item: Pick<LinhaConferencia, "linha" | "situacao" | "validacao">,
  linhasIgnoradas?: ReadonlySet<number>,
  decisoes?: ReadonlyMap<number, AcaoConflitoImportacao>,
): boolean {
  const situacao = situacaoEfetivaPreVisualizacao(item, { linhasIgnoradas, decisoes });
  if (
    situacao === "erro" ||
    situacao === "duplicado" ||
    situacao === "manual_protegido" ||
    situacao === "revisao" ||
    situacao === "ignorado"
  ) {
    return false;
  }
  if (item.validacao?.resultado === "erro") return false;
  return situacao === "novo" || situacao === "atualizacao";
}

export function serializarDecisoesLinha(
  decisoes: ReadonlyMap<number, AcaoConflitoImportacao>,
): import("@/lib/importacao-centro/detecao-duplicidades/types").DecisaoLinhaImportacao[] {
  return [...decisoes.entries()]
    .sort(([a], [b]) => a - b)
    .map(([linha, acao]) => ({ linha, acao }));
}

export function mensagensLinhaPreVisualizacao(
  item: Pick<LinhaConferencia, "mensagem" | "validacao">,
): string[] {
  const mensagens: string[] = [];
  if (item.mensagem?.trim()) mensagens.push(item.mensagem.trim());
  for (const inc of item.validacao?.inconsistencias ?? []) {
    mensagens.push(inc.mensagem);
  }
  return [...new Set(mensagens)];
}

export type CorrecaoPreviaSerializada = {
  campo: string;
  valorOriginal: string;
  valorCorrigido: string;
};

export type LinhaPreVisualizacaoSerializada = {
  linha: number;
  situacao: SituacaoLinhaImportacao;
  mensagem?: string;
  resumo?: Record<string, string>;
  conflito?: import("@/lib/importacao-centro/detecao-duplicidades/types").ConflitoImportacaoLinha;
  validacao?: RegistroValidadoImportacao;
  correcoes?: CorrecaoPreviaSerializada[];
};

export function serializarLinhasPreVisualizacao(
  linhas: LinhaConferencia[],
  correcoesPorLinha?: Map<number, Record<string, { original: string; corrigido: string }>>,
): LinhaPreVisualizacaoSerializada[] {
  return linhas.map((item) => {
    const correcoesMap = correcoesPorLinha?.get(item.linha);
    const correcoes = correcoesMap
      ? Object.entries(correcoesMap).map(([campo, valores]) => ({
          campo,
          valorOriginal: valores.original,
          valorCorrigido: valores.corrigido,
        }))
      : undefined;
    return {
      linha: item.linha,
      situacao: item.situacao,
      mensagem: item.mensagem,
      resumo: item.resumo,
      conflito: item.conflito,
      validacao: item.validacao,
      correcoes: correcoes?.length ? correcoes : undefined,
    };
  });
}

export function valoresEditadosDaLinha(
  item: Pick<LinhaPreVisualizacaoSerializada, "correcoes" | "resumo">,
): Record<string, string> | undefined {
  if (!item.correcoes?.length) return undefined;
  const editados: Record<string, string> = {};
  for (const correcao of item.correcoes) {
    editados[correcao.campo] = correcao.valorCorrigido;
    if (correcao.campo === "valorAtualizado") editados.total = correcao.valorCorrigido;
  }
  return editados;
}
