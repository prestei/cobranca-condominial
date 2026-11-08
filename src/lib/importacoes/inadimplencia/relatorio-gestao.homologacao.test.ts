import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { extrairTextoLegivelPdf } from "@/lib/importacoes/inadimplencia/extrair-texto-pdf";
import { interpretarTextoRelatorioInadimplenciaGestao } from "@/lib/importacoes/inadimplencia/interpretar-relatorio-gestao-condominial";
import { escopoCondominios, escopoUnidades, getCadastros, resetCadastrosParaTestes } from "@/data/catalogo";
import { interpretarPlanilhaDebitos } from "@/lib/importacoes/importar-debitos-planilha";
import { interpretarPdfInadimplencia } from "@/lib/importacoes/inadimplencia/pdf-para-matriz-inadimplencia";

const FIXTURE_PDF = path.join(
  process.cwd(),
  "src/test/fixtures/relatorio-inadimplencia-residencial-do-mar.pdf",
);

function somaCampo(
  linhas: Array<{ valorOriginal: string; total: string }>,
  campo: "valorOriginal" | "total",
): number {
  return linhas.reduce((acc, linha) => acc + Number(linha[campo]), 0);
}

test("homologação Residencial do Mar — extração em 8 páginas e registros", () => {
  const buffer = readFileSync(FIXTURE_PDF);
  const extraido = extrairTextoLegivelPdf(buffer);
  assert.ok(extraido.texto.includes("Residencial do Mar"));

  const relatorio = interpretarPdfInadimplencia(buffer);
  assert.ok(relatorio);
  assert.equal(relatorio.paginas, 8);
  assert.ok(relatorio.linhas.length > 100);
  assert.equal(relatorio.condominioNome, "Residencial do Mar");
});

test("homologação Residencial do Mar — reconciliação de subtotais e total geral", () => {
  const buffer = readFileSync(FIXTURE_PDF);
  const { texto } = extrairTextoLegivelPdf(buffer);
  const relatorio = interpretarTextoRelatorioInadimplenciaGestao(texto);
  assert.ok(relatorio.totaisGerais);

  const somaOriginal = somaCampo(relatorio.linhas, "valorOriginal");
  const somaTotal = somaCampo(relatorio.linhas, "total");

  assert.ok(
    Math.abs(somaOriginal - Number(relatorio.totaisGerais!.valorOriginal)) < 0.1,
    `soma valor original ${somaOriginal.toFixed(2)} vs relatório ${relatorio.totaisGerais!.valorOriginal}`,
  );
  assert.ok(
    Math.abs(somaTotal - Number(relatorio.totaisGerais!.total)) < 0.1,
    `soma total ${somaTotal.toFixed(2)} vs relatório ${relatorio.totaisGerais!.total}`,
  );

  const divergenciasSubtotal = relatorio.inconsistencias.filter(
    (item) => item.codigo === "financeira.subtotal_unidade_divergente",
  );
  assert.equal(
    divergenciasSubtotal.length,
    0,
    "subtotais por unidade devem conferir com as linhas extraídas",
  );

  const divergenciaGeral = relatorio.inconsistencias.some(
    (item) => item.codigo === "financeira.total_geral_divergente",
  );
  assert.equal(divergenciaGeral, false);
});

test("homologação Residencial do Mar — planilha vincula condomínio e unidades do cadastro", () => {
  resetCadastrosParaTestes();
  const buffer = readFileSync(FIXTURE_PDF);
  const relatorio = interpretarPdfInadimplencia(buffer);
  assert.ok(relatorio);
  const cadastros = getCadastros();
  const interpretado = interpretarPlanilhaDebitos(
    relatorio.matriz,
    escopoCondominios(cadastros, 6),
    escopoUnidades(cadastros, 6),
    { formato: relatorio.formato },
  );
  assert.equal(interpretado.linhas.filter((item) => item.erro).length, 0);
  assert.ok(interpretado.validos.length >= 350, `validos=${interpretado.validos.length}`);
});

test("homologação — mesma referência com vencimentos distintos não é tratada como duplicata única", () => {
  const buffer = readFileSync(FIXTURE_PDF);
  const relatorio = interpretarPdfInadimplencia(buffer);
  assert.ok(relatorio);
  const grupo = relatorio.linhas.filter(
    (item) => item.unidade === "MB-0201" && item.referencia === "02/2023",
  );
  const vencimentos = new Set(grupo.map((item) => item.vencimento));
  assert.ok(vencimentos.size >= 2);
  assert.ok(grupo.length >= 2);
});
