import { debitoAbertoNaData, hojeIso, type Debito } from "@/data/catalogo";
import {
  debitoInadimplenciaAtiva,
  situacaoOperacionalDebito,
} from "@/lib/debitos/operational-situation";

export type PeriodoInadimplenciaUnidade = {
  id: number;
  unidadeId: number;
  inicioEm: string;
  fimEm: string | null;
  usuarioAberturaId: number | null;
  usuarioEncerramentoId: number | null;
};

/** Unidade inadimplente quando há débito vencido em situação operacional ativa. */
export function unidadeInadimplenteOperacional(debitos: Debito[], dataBase = hojeIso()): boolean {
  return debitos.some(
    (item) => debitoInadimplenciaAtiva(item) && debitoAbertoNaData(item, dataBase),
  );
}

function menorVencimentoDebitosAtivos(debitos: Debito[], dataBase: string): string {
  let menor = dataBase;
  for (const item of debitos) {
    if (!debitoInadimplenciaAtiva(item) || !debitoAbertoNaData(item, dataBase)) continue;
    if (item.dataVencimento && item.dataVencimento < menor) menor = item.dataVencimento;
  }
  return menor;
}

function dataEncerramentoPeriodo(debitos: Debito[], dataBase: string): string {
  let max = dataBase;
  for (const item of debitos) {
    const sit = situacaoOperacionalDebito(item);
    if (sit !== "Quitada" && sit !== "Prescrita") continue;
    if (item.dataPagamento && item.dataPagamento > max) max = item.dataPagamento;
    const prescrito = item.prescritoEm?.slice(0, 10);
    if (prescrito && prescrito > max) max = prescrito;
  }
  return max;
}

export type TransicaoPeriodoInadimplencia =
  | { tipo: "abrir"; inicioEm: string }
  | { tipo: "fechar"; fimEm: string }
  | { tipo: "nenhuma" };

/**
 * Define se é necessário abrir ou fechar período com base no estado atual da unidade.
 * `periodoAberto` é o período com `fimEm` nulo, se existir.
 */
export function resolverTransicaoPeriodoInadimplencia(
  debitos: Debito[],
  periodoAberto: PeriodoInadimplenciaUnidade | null,
  dataBase = hojeIso(),
): TransicaoPeriodoInadimplencia {
  const inadimplente = unidadeInadimplenteOperacional(debitos, dataBase);
  if (inadimplente && !periodoAberto) {
    return { tipo: "abrir", inicioEm: menorVencimentoDebitosAtivos(debitos, dataBase) };
  }
  if (!inadimplente && periodoAberto) {
    return { tipo: "fechar", fimEm: dataEncerramentoPeriodo(debitos, dataBase) };
  }
  return { tipo: "nenhuma" };
}