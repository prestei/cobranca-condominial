import {
  hojeIso,
  situacaoCobrancaUnidade,
  situacoesUnidade,
  unidadeNaFilaCobrancaAtiva,
  type Debito,
  type Unidade,
} from "@/data/catalogo";
import { unidadeInadimplenteOperacional } from "@/lib/unidades/delinquency-periods";

type SituacaoCobranca = (typeof situacoesUnidade)[number];

/**
 * Após quitação dos débitos, tira a unidade da fila operacional quando não há mais inadimplência ativa.
 * Não altera unidade já fora da fila (ex.: Quitada manual) nem força “Em dia” sem consultar débitos.
 */
export function situacaoCobrancaDestinoAposReavaliacao(
  unidade: Pick<Unidade, "situacao">,
  debitos: Debito[],
  dataBase = hojeIso(),
): SituacaoCobranca | null {
  if (!unidadeNaFilaCobrancaAtiva(unidade)) return null;
  if (unidadeInadimplenteOperacional(debitos, dataBase)) return null;
  const atual = situacaoCobrancaUnidade(unidade);
  if (atual === "Sem cobrança") return null;
  return "Sem cobrança";
}