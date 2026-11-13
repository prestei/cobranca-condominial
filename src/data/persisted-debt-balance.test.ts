import assert from "node:assert/strict";
import test from "node:test";
import { persistedDebtBalance, persistedDebtBalanceAmount } from "@/data/catalogo";

test("usa valor quando valorAtualizado está vazio", () => {
  assert.equal(persistedDebtBalance({ valorAtualizado: "", valor: "350", valorOriginal: "" }), "350");
  assert.equal(persistedDebtBalanceAmount({ valorAtualizado: "", valor: "350", valorOriginal: "" }), 350);
});

test("prioriza valorAtualizado quando preenchido", () => {
  assert.equal(
    persistedDebtBalance({ valorAtualizado: "400", valor: "350", valorOriginal: "300" }),
    "400",
  );
});

test("cai no valorOriginal se necessário", () => {
  assert.equal(persistedDebtBalance({ valorAtualizado: "", valor: "", valorOriginal: "142" }), "142");
});
