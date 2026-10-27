import { setAtribuicoesCobranca, type AtribuicaoCobranca } from "@/data/catalogo";

export function aplicarSnapshotAtribuicoes(atribuicoes: AtribuicaoCobranca[]) {
  setAtribuicoesCobranca(atribuicoes);
}
