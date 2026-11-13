import test from "node:test";
import assert from "node:assert/strict";
import { aplicarMascaraMoedaPtBr } from "./moeda-input.ts";

test("aplicarMascaraMoedaPtBr formata centavos enquanto digita", () => {
  assert.equal(aplicarMascaraMoedaPtBr("1"), "0,01");
  assert.equal(aplicarMascaraMoedaPtBr("12"), "0,12");
  assert.equal(aplicarMascaraMoedaPtBr("1234"), "12,34");
  assert.equal(aplicarMascaraMoedaPtBr("123456"), "1.234,56");
});

test("aplicarMascaraMoedaPtBr interpreta texto colado", () => {
  assert.equal(aplicarMascaraMoedaPtBr("120000"), "1.200,00");
});
