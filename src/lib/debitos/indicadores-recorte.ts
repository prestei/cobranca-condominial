import { formatarMoeda, type Cadastros, type Debito } from "@/data/catalogo";
import { chaveUnicaIndicador } from "@/lib/debitos/indicadores";
import type { DebitoNegociacaoFinanceira } from "@/lib/debitos/negotiation-financial-sync";
import {
  saldoPendenteDebito,
  diasAtrasoDebito,
} from "@/lib/debitos/recorte-listagem-operacional";
import type { RecorteListagemInadimplenciaId } from "@/lib/debitos/painel-situacao";

export type IndicadorRecorteItem = {
  id: string;
  rotulo: string;
  valor: string;
  detalhe?: string;
};

function deduplicar(itens: Debito[]): Debito[] {
  const vistos = new Set<string>();
  const saida: Debito[] = [];
  for (const item of itens) {
    const chave = chaveUnicaIndicador(item);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(item);
  }
  return saida;
}

function somaOriginal(itens: Debito[]): number {
  let total = 0;
  for (const item of itens) {
    total += Number(item.valorOriginal) || 0;
  }
  return total;
}

function somaCampo(itens: Debito[], campo: keyof Debito): number {
  let total = 0;
  for (const item of itens) {
    total += Number(item[campo]) || 0;
  }
  return total;
}

export function calcularIndicadoresRecorte(
  recorte: RecorteListagemInadimplenciaId,
  itens: Debito[],
  dataBase: string,
  cadastros: Cadastros,
  negociacaoPorDebito: Map<number, DebitoNegociacaoFinanceira>,
): IndicadorRecorteItem[] {
  const base = deduplicar(itens);
  const qtd = base.length;
  const original = somaOriginal(base);
  const moeda = (n: number) => formatarMoeda(String(n.toFixed(2)));

  if (recorte === "em_aberto") {
    let saldo = 0;
    let diasMax = 0;
  let comAtraso = 0;
    for (const item of base) {
      const neg = negociacaoPorDebito.get(item.id);
      saldo += saldoPendenteDebito(item, neg, dataBase);
      const dias = diasAtrasoDebito(item, dataBase);
      if (dias !== null) {
        comAtraso += 1;
        diasMax = Math.max(diasMax, dias);
      }
    }
    return [
      { id: "qtd", rotulo: "Dívidas em aberto", valor: String(qtd) },
      { id: "original", rotulo: "Valor original", valor: moeda(original) },
      { id: "saldo", rotulo: "Saldo pendente", valor: moeda(saldo) },
      {
        id: "atraso",
        rotulo: "Maior atraso",
        valor: comAtraso > 0 ? `${diasMax} dias` : "—",
        detalhe: `${comAtraso} com vencimento na data-base`,
      },
    ];
  }

  if (recorte === "em_negociacao") {
    let saldo = 0;
    let pago = 0;
    let negociado = 0;
    for (const item of base) {
      const neg = negociacaoPorDebito.get(item.id);
      if (neg) {
        saldo += Number(neg.saldoRestante) || 0;
        pago += Number(neg.valorPagoConfirmado) || 0;
        negociado += Number(neg.valorNegociado) || 0;
      }
    }
    return [
      { id: "qtd", rotulo: "Em negociação", valor: String(qtd) },
      { id: "negociado", rotulo: "Valor negociado", valor: moeda(negociado) },
      { id: "pago", rotulo: "Valor pago", valor: moeda(pago) },
      { id: "saldo", rotulo: "Saldo restante", valor: moeda(saldo) },
    ];
  }

  if (recorte === "quitadas") {
    const quitado = somaCampo(base, "valorPago") || somaCampo(base, "valorAtualizado");
    const comNegociacao = base.filter((item) => negociacaoPorDebito.has(item.id)).length;
    return [
      { id: "qtd", rotulo: "Quitadas", valor: String(qtd) },
      { id: "original", rotulo: "Valor original", valor: moeda(original) },
      { id: "quitado", rotulo: "Valor quitado", valor: moeda(quitado) },
      {
        id: "neg",
        rotulo: "Com negociação",
        valor: String(comNegociacao),
        detalhe: "registros vinculados a acordo",
      },
    ];
  }

  if (recorte === "prescritas") {
    return [
      { id: "qtd", rotulo: "Prescritas", valor: String(qtd) },
      { id: "original", rotulo: "Valor original", valor: moeda(original) },
      {
        id: "unidades",
        rotulo: "Unidades",
        valor: String(new Set(base.map((item) => item.unidadeId)).size),
      },
    ];
  }

  const unidades = new Set(base.map((item) => item.unidadeId)).size;
  return [
    { id: "qtd", rotulo: "Registros no histórico", valor: String(qtd) },
    {
      id: "unidades",
      rotulo: "Unidades distintas",
      valor: String(unidades),
      detalhe:
        unidades === 1
          ? "Consulte períodos e linha do tempo abaixo"
          : "Filtre por unidade para ver períodos e movimentações",
    },
  ];
}