import assert from "node:assert/strict";
import test from "node:test";

function centavos(valor) {
  const n = Number(String(valor).replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function deCentavos(c) {
  return (c / 100).toFixed(2);
}

function somaPagamentosParcela(parcelaId, pagamentos, confirmacao) {
  let total = 0;
  for (const item of pagamentos) {
    if (item.parcelaId !== parcelaId) continue;
    if (confirmacao && item.confirmacao !== confirmacao) continue;
    total += centavos(item.valor);
  }
  return total;
}

function statusParcelaAcordo(parcela, pagamentos, hoje) {
  if (parcela.canceladoEm) return "Cancelada";
  const confirmado = somaPagamentosParcela(parcela.id, pagamentos, "Confirmado");
  if (confirmado >= centavos(parcela.valorPrevisto)) return "Paga";
  if (parcela.vencimentoEm < hoje) return "Vencida";
  return "Pendente";
}

function calcularResumoAcordo(proposta, parcelas, pagamentos, hoje) {
  const enriquecidas = parcelas.map((parcela) => ({
    ...parcela,
    status: statusParcelaAcordo(parcela, pagamentos, hoje),
    valorPagoConfirmado: deCentavos(somaPagamentosParcela(parcela.id, pagamentos, "Confirmado")),
  }));

  const valorAcordadoCent =
    enriquecidas.length > 0
      ? enriquecidas.reduce((sum, item) => sum + centavos(item.valorPrevisto), 0)
      : centavos(proposta.valorProposto);

  let pagoConfirmado = 0;
  for (const item of pagamentos) {
    if (item.propostaId !== proposta.id) continue;
    if (item.confirmacao === "Confirmado") pagoConfirmado += centavos(item.valor);
  }

  const ativas = enriquecidas.filter((item) => item.status !== "Cancelada");

  return {
    valorAcordado: deCentavos(valorAcordadoCent),
    valorPagoConfirmado: deCentavos(pagoConfirmado),
    saldoRestante: deCentavos(Math.max(0, valorAcordadoCent - pagoConfirmado)),
    parcelasTotal: ativas.length,
    parcelasPagas: ativas.filter((item) => item.status === "Paga").length,
    parcelasPendentes: ativas.filter((item) => item.status === "Pendente").length,
    parcelasVencidas: ativas.filter((item) => item.status === "Vencida").length,
    parcelas: enriquecidas,
  };
}

test("proposta aceita sem parcelas usa valor proposto como acordado", () => {
  const resumo = calcularResumoAcordo({ id: "p1", valorProposto: "500.00", unidadeId: 1 }, [], [], "2026-10-26");
  assert.equal(resumo.valorAcordado, "500.00");
  assert.equal(resumo.valorPagoConfirmado, "0.00");
  assert.equal(resumo.parcelasPagas, 0);
});

test("parcela vencida sem pagamento confirmado", () => {
  const parcela = {
    id: "par1",
    propostaId: "p1",
    numero: 1,
    valorPrevisto: "100.00",
    vencimentoEm: "2026-10-01",
    canceladoEm: "",
  };
  const resumo = calcularResumoAcordo({ id: "p1", valorProposto: "100.00", unidadeId: 1 }, [parcela], [], "2026-10-26");
  assert.equal(resumo.parcelas[0].status, "Vencida");
  assert.equal(resumo.parcelasVencidas, 1);
});

test("pagamento informado não reduz saldo confirmado", () => {
  const parcela = {
    id: "par1",
    propostaId: "p1",
    numero: 1,
    valorPrevisto: "100.00",
    vencimentoEm: "2026-11-01",
    canceladoEm: "",
  };
  const pagamentos = [
    { id: "pay1", propostaId: "p1", parcelaId: "par1", valor: "100.00", confirmacao: "Informado" },
  ];
  const resumo = calcularResumoAcordo({ id: "p1", valorProposto: "100.00", unidadeId: 1 }, [parcela], pagamentos, "2026-10-26");
  assert.equal(resumo.valorPagoConfirmado, "0.00");
  assert.equal(resumo.saldoRestante, "100.00");
  assert.equal(resumo.parcelas[0].status, "Pendente");
});

test("pagamento confirmado quita parcela e reduz saldo", () => {
  const parcela = {
    id: "par1",
    propostaId: "p1",
    numero: 1,
    valorPrevisto: "100.00",
    vencimentoEm: "2026-11-01",
    canceladoEm: "",
  };
  const pagamentos = [
    { id: "pay1", propostaId: "p1", parcelaId: "par1", valor: "100.00", confirmacao: "Confirmado" },
  ];
  const resumo = calcularResumoAcordo({ id: "p1", valorProposto: "100.00", unidadeId: 1 }, [parcela], pagamentos, "2026-10-26");
  assert.equal(resumo.parcelas[0].status, "Paga");
  assert.equal(resumo.parcelasPagas, 1);
  assert.equal(resumo.saldoRestante, "0.00");
});

test("parcela cancelada fora dos totais ativos", () => {
  const parcelas = [
    {
      id: "par1",
      propostaId: "p1",
      numero: 1,
      valorPrevisto: "50.00",
      vencimentoEm: "2026-11-01",
      canceladoEm: "2026-10-01T00:00:00.000Z",
    },
    {
      id: "par2",
      propostaId: "p1",
      numero: 2,
      valorPrevisto: "50.00",
      vencimentoEm: "2026-12-01",
      canceladoEm: "",
    },
  ];
  const resumo = calcularResumoAcordo({ id: "p1", valorProposto: "100.00", unidadeId: 1 }, parcelas, [], "2026-10-26");
  assert.equal(resumo.parcelas[0].status, "Cancelada");
  assert.equal(resumo.parcelasTotal, 1);
});

test("exemplo 6000 em 12 parcelas com 4 pagas", () => {
  const parcelas = Array.from({ length: 12 }, (_, i) => ({
    id: `par${i + 1}`,
    propostaId: "p1",
    numero: i + 1,
    valorPrevisto: "500.00",
    vencimentoEm: `2026-${String(i + 1).padStart(2, "0")}-10`,
    canceladoEm: "",
  }));
  const pagamentos = parcelas.slice(0, 4).map((parcela, index) => ({
    id: `pay${index}`,
    propostaId: "p1",
    parcelaId: parcela.id,
    valor: "500.00",
    confirmacao: "Confirmado",
  }));
  const resumo = calcularResumoAcordo({ id: "p1", valorProposto: "6000.00", unidadeId: 1 }, parcelas, pagamentos, "2026-04-01");
  assert.equal(resumo.parcelasPagas, 4);
  assert.equal(resumo.parcelasPendentes, 8);
  assert.equal(resumo.valorPagoConfirmado, "2000.00");
  assert.equal(resumo.saldoRestante, "4000.00");
});
