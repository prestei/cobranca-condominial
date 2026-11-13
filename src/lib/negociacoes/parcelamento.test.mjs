import assert from "node:assert/strict";
import test from "node:test";

function centavos(valor) {
  const n = Number(String(valor).replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function deCentavos(c) {
  return (c / 100).toFixed(2);
}

function distribuirValorEmParcelas(valorTotal, quantidade) {
  const totalCent = centavos(valorTotal);
  const base = Math.floor(totalCent / quantidade);
  const resto = totalCent - base * quantidade;
  const partes = Array.from({ length: quantidade }, () => base);
  for (let i = 0; i < resto; i++) partes[i] += 1;
  return partes.map(deCentavos);
}

function parcelasCoerentesComValorAcordado(somaCent, valorAcordadoCent) {
  return Math.abs(somaCent - valorAcordadoCent) <= 1;
}

test("6000 em 12 parcelas soma ao valor negociado", () => {
  const valores = distribuirValorEmParcelas("6000.00", 12);
  assert.equal(valores.length, 12);
  const soma = valores.reduce((acc, item) => acc + centavos(item), 0);
  assert.equal(soma, centavos("6000.00"));
  assert.ok(parcelasCoerentesComValorAcordado(soma, centavos("6000.00")));
});

test("arredondamento distribui centavos extras nas primeiras parcelas", () => {
  const valores = distribuirValorEmParcelas("100.00", 3);
  const soma = valores.reduce((acc, item) => acc + centavos(item), 0);
  assert.equal(soma, 10000);
  assert.deepEqual(valores.map(centavos), [3334, 3333, 3333]);
});

test("desconto máximo rejeita valor abaixo do permitido", () => {
  const atualizado = centavos("1000.00");
  const proposto = centavos("600.00");
  const desconto = ((atualizado - proposto) / atualizado) * 100;
  assert.equal(desconto, 40);
  assert.ok(desconto > 30);
});
