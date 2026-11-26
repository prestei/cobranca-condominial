import { debitoEmAberto, type Cadastros } from "@/data/catalogo";
import { somarValorAtualizadoSemDuplicata } from "@/lib/debitos/indicadores";
import type { EncaminhamentoJuridicoDetalhe } from "@/lib/juridico/service";

/** Soma dos débitos vinculados ao encaminhamento; se vazio, usa débitos em aberto da unidade. */
export function valorDebitosEncaminhamento(
  item: EncaminhamentoJuridicoDetalhe,
  cadastros: Cadastros,
): number {
  const ids = new Set(item.debitoIds ?? []);
  const debitos =
    ids.size > 0
      ? cadastros.debitos.filter((debito) => ids.has(debito.id))
      : cadastros.debitos.filter(
          (debito) => debito.unidadeId === item.unidadeId && debitoEmAberto(debito),
        );
  return somarValorAtualizadoSemDuplicata(debitos);
}