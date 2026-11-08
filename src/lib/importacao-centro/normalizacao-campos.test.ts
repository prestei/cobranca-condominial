import assert from "node:assert/strict";
import test from "node:test";
import { statusDebito } from "@/data/catalogo";
import {
  normalizarCampoVazioImportacao,
  normalizarCategoriaImportacao,
  normalizarCodigoIdentificacaoImportacao,
  normalizarCpfCnpjImportacao,
  normalizarDataImportacao,
  normalizarDecimalImportacao,
  normalizarEmailImportacao,
  normalizarNomeImportacao,
  normalizarStatusDebitoImportacao,
  normalizarTelefoneImportacao,
  normalizarValorMonetarioImportacao,
} from "@/lib/importacao-centro/normalizacao-campos";
import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";

test("normalizarDataImportacao converte DD/MM/AAAA para ISO", () => {
  const r = normalizarDataImportacao("19/09/2026");
  assert.equal(r.original, "19/09/2026");
  assert.equal(r.normalizado, "2026-09-19");
  assert.equal(r.vazio, false);
  assert.equal(r.erro, undefined);
});

test("normalizarDataImportacao sinaliza ambiguidade quando dia e mês <= 12", () => {
  const r = normalizarDataImportacao("05/06/2026");
  assert.equal(r.normalizado, "2026-06-05");
  assert.equal(r.ambiguo, true);
});

test("normalizarDataImportacao rejeita data inválida", () => {
  const r = normalizarDataImportacao("32/01/2026");
  assert.equal(r.normalizado, null);
  assert.ok(r.erro);
});

test("normalizarValorMonetarioImportacao interpreta pt-BR com símbolo", () => {
  const r = normalizarValorMonetarioImportacao("R$ 1.250,50");
  assert.equal(r.original, "R$ 1.250,50");
  assert.equal(r.normalizado, "1250.50");
});

test("normalizarValorMonetarioImportacao sinaliza valor não interpretável", () => {
  const r = normalizarValorMonetarioImportacao("abc", { obrigatorio: true });
  assert.equal(r.normalizado, null);
  assert.ok(r.erro);
});

test("normalizarDecimalImportacao aceita número sem moeda", () => {
  const r = normalizarDecimalImportacao("1.234,56");
  assert.equal(r.normalizado, "1234.56");
});

test("normalizarNomeImportacao colapsa espaços sem alterar caixa", () => {
  const r = normalizarNomeImportacao("  JOÃO DA SILVA  ");
  assert.equal(r.original, "  JOÃO DA SILVA  ");
  assert.equal(r.normalizado, "JOÃO DA SILVA");
});

test("normalizarCampoVazioImportacao reconhece marcadores vazios", () => {
  assert.equal(normalizarCampoVazioImportacao("—").vazio, true);
  assert.equal(normalizarCampoVazioImportacao("n/a").vazio, true);
  assert.equal(normalizarCampoVazioImportacao("  ").vazio, true);
});

test("normalizarCpfCnpjImportacao remove máscara", () => {
  const r = normalizarCpfCnpjImportacao("123.456.789-09");
  assert.equal(r.normalizado, "12345678909");
});

test("normalizarCpfCnpjImportacao sinaliza dígitos inválidos", () => {
  const r = normalizarCpfCnpjImportacao("12345");
  assert.equal(r.ambiguo, true);
  assert.ok(r.erro);
});

test("normalizarCategoriaImportacao remove acento para comparação", () => {
  const r = normalizarCategoriaImportacao("  Situação Especial  ");
  assert.equal(r.normalizado, "situacao especial");
});

test("normalizarTelefoneImportacao extrai dígitos", () => {
  const r = normalizarTelefoneImportacao("(11) 98877-6655");
  assert.equal(r.normalizado, "11988776655");
});

test("normalizarTelefoneImportacao rejeita sequência curta", () => {
  const r = normalizarTelefoneImportacao("1234");
  assert.equal(r.normalizado, null);
  assert.ok(r.erro);
});

test("normalizarEmailImportacao minúsculas e validação básica", () => {
  const r = normalizarEmailImportacao("  Contato@Exemplo.COM  ");
  assert.equal(r.normalizado, "contato@exemplo.com");
});

test("normalizarEmailImportacao rejeita formato inválido", () => {
  const r = normalizarEmailImportacao("sem-arroba");
  assert.equal(r.normalizado, null);
  assert.ok(r.erro);
});

test("normalizarCodigoIdentificacaoImportacao remove espaços extras", () => {
  const r = normalizarCodigoIdentificacaoImportacao("  EXT-  99  ");
  assert.equal(r.normalizado, "EXT- 99");
});

test("normalizarStatusDebitoImportacao aceita acento e caixa", () => {
  const r = normalizarStatusDebitoImportacao("  vencido  ", statusDebito);
  assert.equal(r.normalizado, "Vencido");
});

test("normalizarCabecalhoPlanilha alinha rótulos", () => {
  assert.equal(normalizarCabecalhoPlanilha("  Valor Atualizado  "), "valor atualizado");
});
