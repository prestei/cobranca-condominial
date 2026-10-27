import assert from "node:assert/strict";
import test from "node:test";

/** Espelho de src/lib/acordos/resumo.ts — manter alinhado. */
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
  const confirmado = somaPagamentosParcela(parcela.id, pagamentos, "Confirmado");
  if (confirmado >= centavos(parcela.valorPrevisto)) return "Quitada";
  if (parcela.vencimentoEm < hoje) return "Vencida";
  return "Prevista";
}

function calcularResumoAcordo(proposta, parcelas, pagamentos, hoje) {
  const parcelasOrdenadas = [...parcelas].sort((a, b) => a.numero - b.numero);
  const enriquecidas = parcelasOrdenadas.map((parcela) => ({
    ...parcela,
    status: statusParcelaAcordo(parcela, pagamentos, hoje),
    valorPagoConfirmado: deCentavos(somaPagamentosParcela(parcela.id, pagamentos, "Confirmado")),
    valorPagoInformado: deCentavos(somaPagamentosParcela(parcela.id, pagamentos, "Informado")),
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

  const parcelasVencidas = enriquecidas.filter((item) => item.status === "Vencida").length;

  return {
    valorAcordado: deCentavos(valorAcordadoCent),
    valorPagoConfirmado: deCentavos(pagoConfirmado),
    saldoRestante: deCentavos(Math.max(0, valorAcordadoCent - pagoConfirmado)),
    parcelasVencidas,
    potencialDescumprimento: parcelasVencidas > 0,
    parcelas: enriquecidas,
  };
}

test("proposta aceita sem parcelas usa valor proposto como acordado", () => {
  const resumo = calcularResumoAcordo(
    { id: "p1", valorProposto: "500.00", unidadeId: 1 },
    [],
    [],
    "2026-10-26",
  );
  assert.equal(resumo.valorAcordado, "500.00");
  assert.equal(resumo.valorPagoConfirmado, "0.00");
  assert.equal(resumo.potencialDescumprimento, false);
});

test("parcela vencida sem pagamento confirmado gera potencial descumprimento", () => {
  const parcela = {
    id: "par1",
    propostaId: "p1",
    numero: 1,
    valorPrevisto: "100.00",
    vencimentoEm: "2026-10-01",
  };
  const resumo = calcularResumoAcordo({ id: "p1", valorProposto: "100.00", unidadeId: 1 }, [parcela], [], "2026-10-26");
  assert.equal(resumo.parcelas[0].status, "Vencida");
  assert.equal(resumo.potencialDescumprimento, true);
});

test("pagamento informado não reduz saldo confirmado", () => {
  const parcela = {
    id: "par1",
    propostaId: "p1",
    numero: 1,
    valorPrevisto: "100.00",
    vencimentoEm: "2026-11-01",
  };
  const pagamentos = [
    {
      id: "pay1",
      propostaId: "p1",
      parcelaId: "par1",
      valor: "100.00",
      confirmacao: "Informado",
    },
  ];
  const resumo = calcularResumoAcordo({ id: "p1", valorProposto: "100.00", unidadeId: 1 }, [parcela], pagamentos, "2026-10-26");
  assert.equal(resumo.valorPagoConfirmado, "0.00");
  assert.equal(resumo.saldoRestante, "100.00");
  assert.equal(resumo.parcelas[0].status, "Prevista");
});

test("pagamento confirmado quita parcela e reduz saldo", () => {
  const parcela = {
    id: "par1",
    propostaId: "p1",
    numero: 1,
    valorPrevisto: "100.00",
    vencimentoEm: "2026-11-01",
  };
  const pagamentos = [
    {
      id: "pay1",
      propostaId: "p1",
      parcelaId: "par1",
      valor: "100.00",
      confirmacao: "Confirmado",
    },
  ];
  const resumo = calcularResumoAcordo({ id: "p1", valorProposto: "100.00", unidadeId: 1 }, [parcela], pagamentos, "2026-10-26");
  assert.equal(resumo.parcelas[0].status, "Quitada");
  assert.equal(resumo.saldoRestante, "0.00");
});
