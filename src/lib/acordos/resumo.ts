import {
  confirmacaoPagamentoAcordo,
  statusParcelaAcordo as statusParcelaAcordoCatalogo,
  type PagamentoAcordo,
  type ParcelaAcordo,
  type PropostaNegociacao,
} from "@/data/catalogo";

export type StatusParcelaAcordo = (typeof statusParcelaAcordoCatalogo)[number];

export type ParcelaAcordoEnriquecida = ParcelaAcordo & {
  status: StatusParcelaAcordo;
  valorPagoConfirmado: string;
  valorPagoInformado: string;
};

export type ResumoAcordo = {
  propostaId: string;
  unidadeId: number;
  valorAcordado: string;
  valorPagoConfirmado: string;
  valorPagoInformado: string;
  saldoRestante: string;
  parcelasVencidas: number;
  /** Indício operacional — não equivale a “acordo quebrado” (regra oficial pendente). */
  potencialDescumprimento: boolean;
  parcelas: ParcelaAcordoEnriquecida[];
};

function centavos(valor: string): number {
  const n = Number(String(valor).replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function deCentavos(c: number): string {
  return (c / 100).toFixed(2);
}

export function dataReferenciaHoje(timeZone = "America/Sao_Paulo"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(),
  );
}

export function somaPagamentosParcela(
  parcelaId: string,
  pagamentos: PagamentoAcordo[],
  confirmacao?: (typeof confirmacaoPagamentoAcordo)[number],
): number {
  let total = 0;
  for (const item of pagamentos) {
    if (item.parcelaId !== parcelaId) continue;
    if (confirmacao && item.confirmacao !== confirmacao) continue;
    total += centavos(item.valor);
  }
  return total;
}

export function calcularStatusParcelaAcordo(
  parcela: ParcelaAcordo,
  pagamentos: PagamentoAcordo[],
  hoje = dataReferenciaHoje(),
): StatusParcelaAcordo {
  const confirmado = somaPagamentosParcela(parcela.id, pagamentos, "Confirmado");
  if (confirmado >= centavos(parcela.valorPrevisto)) return "Quitada";
  if (parcela.vencimentoEm < hoje) return "Vencida";
  return "Prevista";
}

export function calcularResumoAcordo(
  proposta: PropostaNegociacao,
  parcelas: ParcelaAcordo[],
  pagamentos: PagamentoAcordo[],
  hoje = dataReferenciaHoje(),
): ResumoAcordo {
  const parcelasOrdenadas = [...parcelas].sort((a, b) => a.numero - b.numero || a.vencimentoEm.localeCompare(b.vencimentoEm));
  const enriquecidas: ParcelaAcordoEnriquecida[] = parcelasOrdenadas.map((parcela) => {
    const valorPagoConfirmado = deCentavos(somaPagamentosParcela(parcela.id, pagamentos, "Confirmado"));
    const valorPagoInformado = deCentavos(somaPagamentosParcela(parcela.id, pagamentos, "Informado"));
    return {
      ...parcela,
      status: calcularStatusParcelaAcordo(parcela, pagamentos, hoje),
      valorPagoConfirmado,
      valorPagoInformado,
    };
  });

  const valorAcordadoCent =
    enriquecidas.length > 0
      ? enriquecidas.reduce((sum, item) => sum + centavos(item.valorPrevisto), 0)
      : centavos(proposta.valorProposto);

  let pagoConfirmado = 0;
  let pagoInformado = 0;
  for (const item of pagamentos) {
    if (item.propostaId !== proposta.id) continue;
    if (item.confirmacao === "Confirmado") pagoConfirmado += centavos(item.valor);
    if (item.confirmacao === "Informado") pagoInformado += centavos(item.valor);
  }

  const parcelasVencidas = enriquecidas.filter((item) => item.status === "Vencida").length;
  const potencialDescumprimento = parcelasVencidas > 0;

  return {
    propostaId: proposta.id,
    unidadeId: proposta.unidadeId,
    valorAcordado: deCentavos(valorAcordadoCent),
    valorPagoConfirmado: deCentavos(pagoConfirmado),
    valorPagoInformado: deCentavos(pagoInformado),
    saldoRestante: deCentavos(Math.max(0, valorAcordadoCent - pagoConfirmado)),
    parcelasVencidas,
    potencialDescumprimento,
    parcelas: enriquecidas,
  };
}
