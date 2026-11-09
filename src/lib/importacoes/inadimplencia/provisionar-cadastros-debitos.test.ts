import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getCadastros, resetCadastrosParaTestes, setCondominios, setUnidades } from "@/data/catalogo";
import { adaptadorImportacaoDebitos } from "@/lib/importacao-centro/adaptadores/debitos";
import { processarArquivoImportacao } from "@/lib/importacao-centro/processamento";
import { provisionarCadastrosImportacaoDebitos } from "@/lib/importacoes/inadimplencia/provisionar-cadastros-debitos";
import { interpretarPdfInadimplencia } from "@/lib/importacoes/inadimplencia/pdf-para-matriz-inadimplencia";

const MATRIZ = [
  [
    "Condomínio",
    "Unidade",
    "Referência",
    "Vencimento",
    "Valor atualizado",
  ],
  ["Condomínio Novo Import", "A-101", "09/2026", "05/09/2026", "R$ 100,00"],
  ["Condomínio Novo Import", "A-102", "09/2026", "06/09/2026", "R$ 200,00"],
];

test("provisionarCadastrosImportacaoDebitos cria condomínio e unidades ausentes", () => {
  resetCadastrosParaTestes();
  setCondominios(getCadastros().condominios.filter((item) => item.nome !== "Condomínio Novo Import"));
  setUnidades(getCadastros().unidades.filter((item) => item.identificacao !== "A-101" && item.identificacao !== "A-102"));

  const antesCondominios = getCadastros().condominios.length;
  const { condominiosCriados, unidadesCriadas } = provisionarCadastrosImportacaoDebitos(MATRIZ, 1, "PDF");

  assert.equal(condominiosCriados.length, 1);
  assert.equal(condominiosCriados[0]?.nome, "Condomínio Novo Import");
  assert.equal(unidadesCriadas.length, 2);
  assert.equal(getCadastros().condominios.length, antesCondominios + 1);
  assert.ok(getCadastros().unidades.some((item) => item.identificacao === "A-101"));
  assert.ok(getCadastros().unidades.some((item) => item.identificacao === "A-102"));
});

test("provisionamento idempotente não duplica condomínio nem unidade", () => {
  resetCadastrosParaTestes();
  setCondominios([]);
  setUnidades([]);

  const primeira = provisionarCadastrosImportacaoDebitos(MATRIZ, 1, "PDF");
  const segunda = provisionarCadastrosImportacaoDebitos(MATRIZ, 1, "PDF");

  assert.equal(primeira.condominiosCriados.length, 1);
  assert.equal(primeira.unidadesCriadas.length, 2);
  assert.equal(segunda.condominiosCriados.length, 0);
  assert.equal(segunda.unidadesCriadas.length, 0);
  assert.equal(getCadastros().condominios.length, 1);
  assert.equal(getCadastros().unidades.length, 2);
});

test("prévia de inadimplência com PDF cria condomínio e unidades sem cadastro prévio", async () => {
  resetCadastrosParaTestes();
  setCondominios([]);
  setUnidades([]);

  const buffer = readFileSync("src/test/fixtures/relatorio-inadimplencia-daniel-jorge-advocacia.pdf");
  const relatorio = await interpretarPdfInadimplencia(buffer);
  assert.ok(relatorio);

  const processado = processarArquivoImportacao(adaptadorImportacaoDebitos, {
    modo: "preview",
    userId: 1,
    origem: "PDF",
    arquivo: "daniel-jorge.pdf",
    hashArquivo: "teste-provisionamento-pdf",
    conteudo: "",
    matrizPlanilha: relatorio.matriz,
    metadadosRelatorio: { tipo: relatorio.formato, inconsistencias: relatorio.inconsistencias ?? [] },
  });

  assert.ok(getCadastros().condominios.some((item) => item.nome === "Residencial do Mar"));
  assert.ok(getCadastros().unidades.length >= 1);
  assert.equal(processado.linhasInternas.filter((item) => item.situacao === "erro").length, 0);
  assert.ok(processado.linhasInternas.some((item) => item.situacao === "novo"));
});
