import assert from "node:assert/strict";
import test from "node:test";
import { statusDebito } from "@/data/catalogo";
import {
  aplicarNormalizacaoRegistro,
  normalizarCampoVazioImportacao,
  normalizarCategoriaImportacao,
  normalizarClassificacaoImportacao,
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
import { inconsistenciasDeNormalizacao } from "@/lib/importacao-centro/inconsistencias-normalizacao";
import { normalizarCabecalhoPlanilha } from "@/lib/importacao-centro/normalizacao";

test("normalizarDataImportacao converte DD/MM/AAAA para ISO", () => {
  const r = normalizarDataImportacao("19/09/2026");
  assert.equal(r.original, "19/09/2026");
  assert.equal(r.normalizado, "2026-09-19");
  assert.equal(r.vazio, false);
  assert.equal(r.erro, undefined);
});

test("normalizarDataImportacao não marca DD/MM/AAAA com barra como ambíguo", () => {
  const r = normalizarDataImportacao("05/06/2026");
  assert.equal(r.normalizado, "2026-06-05");
  assert.equal(r.ambiguo, undefined);
});

test("normalizarDataImportacao sinaliza ambiguidade em data com traço quando dia e mês <= 12", () => {
  const r = normalizarDataImportacao("05-06-2026");
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
  assert.equal(r.normalizado, null);
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

test("normalizarDataImportacao aceita data com horário sem mudar o dia", () => {
  const r = normalizarDataImportacao("19/09/2026 00:00:00");
  assert.equal(r.normalizado, "2026-09-19");
  assert.equal(r.original, "19/09/2026 00:00:00");
  assert.equal(r.ambiguo, true);
});

test("normalizarDataImportacao marca ano com dois dígitos como ambíguo", () => {
  const r = normalizarDataImportacao("19/09/26");
  assert.equal(r.normalizado, "2026-09-19");
  assert.equal(r.ambiguo, true);
});

test("normalizarValorMonetarioImportacao sinaliza 1.250 como milhar ambíguo", () => {
  const r = normalizarValorMonetarioImportacao("1.250");
  assert.equal(r.normalizado, "1250.00");
  assert.equal(r.ambiguo, true);
  assert.equal(r.original, "1.250");
});

test("normalizarCampoVazioImportacao não inventa valor", () => {
  const r = normalizarCampoVazioImportacao("null");
  assert.equal(r.normalizado, null);
  assert.equal(r.vazio, true);
  assert.equal(r.original, "null");
});

test("normalizarCpfCnpjImportacao normaliza CNPJ mascarado", () => {
  const r = normalizarCpfCnpjImportacao("12.345.678/0001-95");
  assert.equal(r.normalizado, "12345678000195");
  assert.equal(r.erro, undefined);
});

test("normalizarClassificacaoImportacao não substitui valor desconhecido", () => {
  const r = normalizarClassificacaoImportacao("Desconhecido", ["Ativo", "Inativo"]);
  assert.equal(r.normalizado, null);
  assert.ok(r.erro);
  assert.equal(r.original, "Desconhecido");
});

test("aplicarNormalizacaoRegistro diferencia original e normalizado por tipo", () => {
  const campos = aplicarNormalizacaoRegistro({
    vencimento: { tipo: "data", raw: "19/09/2026" },
    valor: { tipo: "monetario", raw: "R$ 1.250,50" },
    nome: { tipo: "nome", raw: "  JOÃO DA SILVA  " },
    email: { tipo: "email", raw: "  Contato@Exemplo.COM  " },
    fone: { tipo: "telefone", raw: "(11) 98877-6655" },
    vazio: { tipo: "vazio", raw: "n/a" },
  });
  assert.equal(campos.vencimento.original, "19/09/2026");
  assert.equal(campos.vencimento.normalizado, "2026-09-19");
  assert.equal(campos.valor.normalizado, "1250.50");
  assert.equal(campos.nome.normalizado, "JOÃO DA SILVA");
  assert.equal(campos.email.normalizado, "contato@exemplo.com");
  assert.equal(campos.fone.normalizado, "11988776655");
  assert.equal(campos.vazio.vazio, true);
  assert.equal(campos.vazio.normalizado, null);
});

test("inconsistenciasDeNormalizacao sinaliza ambíguo e não interpretado", () => {
  const campos = aplicarNormalizacaoRegistro({
    vencimento: { tipo: "data", raw: "05-06-2026" },
    valor: { tipo: "monetario", raw: "abc" },
  });
  const itens = inconsistenciasDeNormalizacao(campos);
  assert.ok(itens.some((item) => item.codigo === "normalizacao.campo_ambiguo"));
  assert.ok(itens.some((item) => item.codigo === "normalizacao.interpretacao_rejeitada"));
});

test("normalizarDataImportacao aceita ISO sem marcar ambiguidade", () => {
  const r = normalizarDataImportacao("2026-09-19");
  assert.equal(r.normalizado, "2026-09-19");
  assert.equal(r.original, "2026-09-19");
  assert.equal(r.ambiguo, undefined);
});

test("normalizarValorMonetarioImportacao rejeita agrupamento inválido sem inventar milhar", () => {
  const r = normalizarValorMonetarioImportacao("1.2.3");
  assert.equal(r.original, "1.2.3");
  assert.equal(r.normalizado, null);
  assert.ok(r.erro);
});

test("normalizarValorMonetarioImportacao interpreta milhar pt-BR completo", () => {
  const r = normalizarValorMonetarioImportacao("1.234.567,89");
  assert.equal(r.normalizado, "1234567.89");
  assert.equal(r.original, "1.234.567,89");
});

test("normalizarDecimalImportacao sinaliza milhar ambíguo", () => {
  const r = normalizarDecimalImportacao("1,250");
  assert.equal(r.normalizado, "1250.00");
  assert.equal(r.ambiguo, true);
});

test("normalizarCampoVazioImportacao não preenche nulo nem marcador", () => {
  for (const bruto of ["", "   ", "—", "-", "n/a", "NULL"]) {
    const r = normalizarCampoVazioImportacao(bruto);
    assert.equal(r.vazio, true);
    assert.equal(r.normalizado, null);
    assert.equal(r.original, bruto);
  }
});

test("normalizarStatusDebitoImportacao não inventa status quando a célula está vazia", () => {
  const r = normalizarStatusDebitoImportacao("", statusDebito);
  assert.equal(r.vazio, true);
  assert.equal(r.normalizado, null);
  assert.equal(r.original, "");
});

test("normalizarStatusDebitoImportacao só aplica default explícito do adaptador", () => {
  const r = normalizarStatusDebitoImportacao("n/a", statusDebito, { padraoSeVazio: "Vencido" });
  assert.equal(r.vazio, true);
  assert.equal(r.normalizado, "Vencido");
  assert.equal(r.original, "n/a");
});

test("aplicarNormalizacaoRegistro cobre todos os tipos do Ticket 04", () => {
  const campos = aplicarNormalizacaoRegistro({
    data: { tipo: "data", raw: "19-09-2026" },
    monetario: { tipo: "monetario", raw: "R$ 10,00" },
    decimal: { tipo: "decimal", raw: "3,14" },
    telefone: { tipo: "telefone", raw: "+55 11 98877-6655" },
    email: { tipo: "email", raw: "A@B.COM" },
    cpfCnpj: { tipo: "cpfCnpj", raw: "123.456.789-09" },
    nome: { tipo: "nome", raw: "Ana" },
    codigo: { tipo: "codigo", raw: "U-01" },
    categoria: { tipo: "categoria", raw: "Taxa Extra" },
    vazio: { tipo: "vazio", raw: "" },
  });
  assert.equal(campos.data.normalizado, "2026-09-19");
  assert.equal(campos.monetario.normalizado, "10.00");
  assert.equal(campos.decimal.normalizado, "3.14");
  assert.equal(campos.telefone.normalizado, "5511988776655");
  assert.equal(campos.email.normalizado, "a@b.com");
  assert.equal(campos.cpfCnpj.normalizado, "12345678909");
  assert.equal(campos.nome.normalizado, "Ana");
  assert.equal(campos.codigo.normalizado, "U-01");
  assert.equal(campos.categoria.normalizado, "taxa extra");
  assert.equal(campos.vazio.normalizado, null);
  assert.equal(campos.vazio.vazio, true);
});
