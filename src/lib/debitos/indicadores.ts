import {
  acimaDoLimite,
  debitoAbertoNaData,
  diasDeAtraso,
  type Debito,
} from "@/data/catalogo";

export type DebitoIndicadoresInput = {
  debitos: Debito[];
  dataBase: string;
  limiteDias: number;
  unidadesCarteira: number;
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
    total += Number(item.valorAtualizado) || 0;
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
export function calcularIndicadoresInadimplencia(input: DebitoIndicadoresInput): DebitoIndicadores {
  const { debitos, dataBase, limiteDias, unidadesCarteira } = input;
  const emAbertoNaData = debitos.filter((item) => debitoAbertoNaData(item, dataBase));
  const diasNaBase = (item: Debito) => diasDeAtraso(item.dataVencimento, dataBase);

  const totalOriginal = somarValorOriginalSemDuplicata(emAbertoNaData);
  const totalAtualizado = somarValorAtualizadoSemDuplicata(emAbertoNaData);
  const ateLimite = somarValorAtualizadoSemDuplicata(
    emAbertoNaData.filter((item) => !acimaDoLimite(diasNaBase(item), limiteDias)),
  );
  const acimaLimite = somarValorAtualizadoSemDuplicata(
    emAbertoNaData.filter((item) => acimaDoLimite(diasNaBase(item), limiteDias)),
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
