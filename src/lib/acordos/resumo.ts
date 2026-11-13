import { confirmacaoPagamentoAcordo, statusParcelaAcordo as statusParcelaAcordoCatalogo, type PagamentoAcordo, type ParcelaAcordo, type PropostaNegociacao } from "@/data/catalogo";

export type StatusParcelaAcordo = (typeof statusParcelaAcordoCatalogo)[number];

export type ParcelaAcordoEnriquecida = ParcelaAcordo & {
  status: StatusParcelaAcordo;
  valorPagoConfirmado: string;
  valorPagoInformado: string;
  pagamentos: PagamentoAcordo[];
};

export type ResumoAcordo = {
  propostaId: string;
  unidadeId: number;
  valorAcordado: string;
  valorPagoConfirmado: string;
  valorPagoInformado: string;
  saldoRestante: string;
  parcelasTotal: number;
  parcelasPagas: number;
  parcelasPendentes: number;
  parcelasVencidas: number;
  parcelasCanceladas: number;
  /** Mantido por compatibilidade operacional (contagem de vencidas). */
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
  if (parcela.canceladoEm) return "Cancelada";
  const confirmado = somaPagamentosParcela(parcela.id, pagamentos, "Confirmado");
  if (confirmado >= centavos(parcela.valorPrevisto)) return "Paga";
  if (parcela.vencimentoEm < hoje) return "Vencida";
  return "Pendente";
}

export function calcularResumoAcordo(
  proposta: PropostaNegociacao,
  parcelas: ParcelaAcordo[],
  pagamentos: PagamentoAcordo[],
  hoje = dataReferenciaHoje(),
): ResumoAcordo {
  const parcelasOrdenadas = [...parcelas].sort((a, b) => a.numero - b.numero || a.vencimentoEm.localeCompare(b.vencimentoEm));
  const enriquecidas: ParcelaAcordoEnriquecida[] = parcelasOrdenadas.map((parcela) => {
    const historico = pagamentos.filter((item) => item.parcelaId === parcela.id);
    const valorPagoConfirmado = deCentavos(somaPagamentosParcela(parcela.id, pagamentos, "Confirmado"));
    const valorPagoInformado = deCentavos(somaPagamentosParcela(parcela.id, pagamentos, "Informado"));
    return {
      ...parcela,
      status: calcularStatusParcelaAcordo(parcela, pagamentos, hoje),
      valorPagoConfirmado,
      valorPagoInformado,
      pagamentos: historico.sort((a, b) => a.dataPagamento.localeCompare(b.dataPagamento)),
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

  const parcelasAtivas = enriquecidas.filter((item) => item.status !== "Cancelada");
  const parcelasPagas = parcelasAtivas.filter((item) => item.status === "Paga").length;
  const parcelasVencidas = parcelasAtivas.filter((item) => item.status === "Vencida").length;
  const parcelasPendentes = parcelasAtivas.filter((item) => item.status === "Pendente").length;
  const parcelasCanceladas = enriquecidas.filter((item) => item.status === "Cancelada").length;
  const potencialDescumprimento = parcelasVencidas > 0;

  return {
    propostaId: proposta.id,
    unidadeId: proposta.unidadeId,
    valorAcordado: deCentavos(valorAcordadoCent),
    valorPagoConfirmado: deCentavos(pagoConfirmado),
    valorPagoInformado: deCentavos(pagoInformado),
    saldoRestante: deCentavos(Math.max(0, valorAcordadoCent - pagoConfirmado)),
    parcelasTotal: parcelasAtivas.length,
    parcelasPagas,
    parcelasPendentes,
    parcelasVencidas,
    parcelasCanceladas,
    potencialDescumprimento,
    parcelas: enriquecidas,
  };
}
