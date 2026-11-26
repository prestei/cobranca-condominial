import {
  debitoAbertoNaData,
  debitoEmAberto,
  hojeIso,
  type Cadastros,
  type Debito,
} from "@/data/catalogo";
import { debitoInadimplenciaAtiva } from "@/lib/debitos/operational-situation";

/** Débitos da unidade que compõem a inadimplência ativa na fila (mesma base do total da coluna). */
export function debitosInadimplenciaAtivaUnidade(cadastros: Cadastros, unidadeId: number): Debito[] {
  const dataBase = hojeIso();
  return cadastros.debitos
    .filter(
      (item) =>
        item.unidadeId === unidadeId &&
        debitoInadimplenciaAtiva(item) &&
        debitoAbertoNaData(item, dataBase),
    )
    .sort((a, b) => {
      const porVencimento = a.dataVencimento.localeCompare(b.dataVencimento);
      if (porVencimento !== 0) return porVencimento;
      return a.id - b.id;
    });
}

/** Subconjunto elegível para nova proposta (status em aberto na cobrança). */
export function debitosAbertosParaProposta(cadastros: Cadastros, unidadeId: number): Debito[] {
  return debitosInadimplenciaAtivaUnidade(cadastros, unidadeId).filter(debitoEmAberto);
}