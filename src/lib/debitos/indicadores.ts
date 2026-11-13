import {
  debitoAbertoNaData,
  diasDeAtraso,
  persistedDebtBalanceAmount,
  type Cadastros,
  type Debito,
} from "@/data/catalogo";
import {
  delinquencyTrackingDaysForCondominiumId,
  isAboveDelinquencyTrackingLimit,
  resolveDelinquencyTrackingDays,
} from "@/lib/inadimplencia/delinquency-tracking";

export type DebitoIndicadoresInput = {
  debitos: Debito[];
  dataBase: string;
  /** Legado: usado só quando `catalog` não é informado. */
  limiteDias?: number;
  unidadesCarteira: number;
  catalog?: Cadastros;
};

export type DebitoIndicadores = {
  totalOriginal: number;
  totalAtualizado: number;
  ateLimite: number;
  acimaLimite: number;
  unidadesDevedoras: number;
  percentualUnidades: number | null;
  quantidadeEmAberto: number;
};

/** Chave para evitar somar o mesmo encargo duas vezes nos indicadores (ID externo ou id interno). */
export function chaveUnicaIndicador(item: Pick<Debito, "id" | "identificadorExterno">): string {
  const ext = item.identificadorExterno.trim();
  if (ext) return `ext:${ext.toLocaleLowerCase("pt-BR")}`;
  return `id:${item.id}`;
}

/** Soma `valorAtualizado` sem duplicar registros que representam o mesmo encargo. */
export function somarValorAtualizadoSemDuplicata(itens: Debito[]): number {
  const vistos = new Set<string>();
  let total = 0;
  for (const item of itens) {
    const chave = chaveUnicaIndicador(item);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    total += persistedDebtBalanceAmount(item);
  }
  return total;
}

export function somarValorOriginalSemDuplicata(itens: Debito[]): number {
  const vistos = new Set<string>();
  let total = 0;
  for (const item of itens) {
    const chave = chaveUnicaIndicador(item);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    total += Number(item.valorOriginal) || 0;
  }
  return total;
}

/** Usa apenas valores persistidos; não calcula juros, multa ou correção. */
function trackingDaysForDebt(item: Debito, input: DebitoIndicadoresInput): number {
  if (input.catalog) {
    return delinquencyTrackingDaysForCondominiumId(item.condominioId, input.catalog);
  }
  return resolveDelinquencyTrackingDays(
    input.limiteDias != null ? { delinquencyTrackingDays: input.limiteDias } : null,
  );
}

export function calcularIndicadoresInadimplencia(input: DebitoIndicadoresInput): DebitoIndicadores {
  const { debitos, dataBase, unidadesCarteira } = input;
  const emAbertoNaData = debitos.filter((item) => debitoAbertoNaData(item, dataBase));
  const diasNaBase = (item: Debito) => diasDeAtraso(item.dataVencimento, dataBase);

  const totalOriginal = somarValorOriginalSemDuplicata(emAbertoNaData);
  const totalAtualizado = somarValorAtualizadoSemDuplicata(emAbertoNaData);
  const ateLimite = somarValorAtualizadoSemDuplicata(
    emAbertoNaData.filter(
      (item) => !isAboveDelinquencyTrackingLimit(diasNaBase(item), trackingDaysForDebt(item, input)),
    ),
  );
  const acimaLimite = somarValorAtualizadoSemDuplicata(
    emAbertoNaData.filter((item) =>
      isAboveDelinquencyTrackingLimit(diasNaBase(item), trackingDaysForDebt(item, input)),
    ),
  );

  const unidadesDevedoras = new Set(emAbertoNaData.map((item) => item.unidadeId)).size;
  const percentualUnidades = unidadesCarteira > 0 ? (unidadesDevedoras / unidadesCarteira) * 100 : null;

  return {
    totalOriginal,
    totalAtualizado,
    ateLimite,
    acimaLimite,
    unidadesDevedoras,
    percentualUnidades,
    quantidadeEmAberto: emAbertoNaData.length,
  };
}
