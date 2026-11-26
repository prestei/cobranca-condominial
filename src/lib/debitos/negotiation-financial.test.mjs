import test from "node:test";
import assert from "node:assert/strict";
import {
  planejarAlocacaoNegociacao,
  repartirPagamentosConfirmados,
  calcularSaldoRestanteNegociado,
} from "./negotiation-financial.ts";
import { centavosMonetarios, monetarioDeCentavos } from "../negociacoes/parcelamento.ts";

function debitoBase(overrides) {
  return {
    id: 1,
    valorOriginal: "3500.00",
    valor: "3500.00",
    valorAtualizado: "3500.00",
    ...overrides,
  };
}

test("T25 — formalização: aloca valor negociado e desconto em débito único", () => {
  const aloc = planejarAlocacaoNegociacao([debitoBase({})], "3000.00");
  assert.equal(aloc.length, 1);
  assert.equal(aloc[0].valorOriginalRegistrado, "3500.00");
  assert.equal(aloc[0].valorNegociadoAlocado, "3000.00");
  assert.equal(aloc[0].descontoConcedido, "500.00");
  assert.equal(aloc[0].saldoRestante, "3000.00");
});

test("T25 — pagamento confirmado reduz saldo restante", () => {
  const pagoCent = centavosMonetarios("1000.00");
  const reparte = repartirPagamentosConfirmados(
    [{ debtId: 1, valorNegociadoAlocado: "3000.00" }],
    pagoCent,
  );
  const saldo = calcularSaldoRestanteNegociado(
    centavosMonetarios("3000.00"),
    reparte.get(1) ?? 0,
  );
  assert.equal(monetarioDeCentavos(saldo), "2000.00");
});

test("T25 — segundo pagamento atualiza saldo", () => {
  const totalPagoCent = centavosMonetarios("1500.00");
  const reparte = repartirPagamentosConfirmados(
    [{ debtId: 1, valorNegociadoAlocado: "3000.00" }],
    totalPagoCent,
  );
  const saldo = calcularSaldoRestanteNegociado(centavosMonetarios("3000.00"), reparte.get(1) ?? 0);
  assert.equal(monetarioDeCentavos(saldo), "1500.00");
});