import {
  getCadastros,
  setPagamentosAcordo,
  setParcelasAcordo,
  type PagamentoAcordo,
  type ParcelaAcordo,
} from "@/data/catalogo";

export function aplicarParcelasSalvas(propostaId: string, parcelas: ParcelaAcordo[]) {
  const ids = new Set(parcelas.map((item) => item.id));
  setParcelasAcordo((current) => {
    const restantes = current.filter((item) => item.propostaId !== propostaId || !ids.has(item.id));
    return [...restantes, ...parcelas].sort((a, b) => a.numero - b.numero);
  });
}

export function aplicarPagamentoSalvo(pagamento: PagamentoAcordo, acao: "INSERT" | "UPDATE") {
  if (acao === "INSERT") {
    setPagamentosAcordo((current) => {
      if (current.some((item) => item.id === pagamento.id)) {
        return current.map((item) => (item.id === pagamento.id ? pagamento : item));
      }
      return [...current, pagamento];
    });
  } else {
    setPagamentosAcordo((current) => current.map((item) => (item.id === pagamento.id ? pagamento : item)));
  }
}

export function parcelasLocaisProposta(propostaId: string) {
  return getCadastros()
    .parcelasAcordo.filter((item) => item.propostaId === propostaId)
    .sort((a, b) => a.numero - b.numero);
}
