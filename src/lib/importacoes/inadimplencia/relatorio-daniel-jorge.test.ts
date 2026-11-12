import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  interpretarTextoRelatorioInadimplenciaGestao,
  textoPareceRelatorioInadimplenciaGestao,
} from "@/lib/importacoes/inadimplencia/interpretar-relatorio-gestao-condominial";
import { interpretarPdfInadimplencia } from "@/lib/importacoes/inadimplencia/pdf-para-matriz-inadimplencia";

const FIXTURE_PDF = path.join(
  process.cwd(),
  "src/test/fixtures/relatorio-inadimplencia-daniel-jorge-advocacia.pdf",
);

test("PDF Daniel Jorge Advocacia — detecta layout e extrai débitos da amostra", async () => {
  const buffer = readFileSync(FIXTURE_PDF);
  const relatorio = await interpretarPdfInadimplencia(buffer);
  assert.ok(relatorio, "deve reconhecer relatório sem marca Gestão Condominial");
  assert.equal(relatorio.condominioNome, "Residencial do Mar");
  assert.ok(relatorio.linhas.length >= 8, "amostra de 1 página contém vários lançamentos");
  const mb0102 = relatorio.linhas.filter((l) => l.unidade === "MB-0102");
  assert.ok(mb0102.length >= 4);
  assert.equal(mb0102[0]?.responsavel, "Gleide Nunes Rocha");
});

test("layout Daniel Jorge — torres T1/T2 e lançamento com descrição quebrada em duas linhas", () => {
  const texto = `
UNIDADES INADIMPLENTES
Condomínio Residencial Grand Park Data Base: 11/11/2026
Unidade: T1-0402 — Eduardo Vasconcelos Rios
TAXA CONDOMINIAL 05/2026 10/05/2026 1.420,00 85,20 28,40 35,50 1.569,10
CHAMADA DE CAPA (PINTURA
01/05) 06/2026 20/06/2026 400,00 19,60 8,00 8,40 436,00
Total 'T1-0402': 1.820,00 104,80 36,40 44,00 2.005,10
TOTAL GERAL ACUMULADO 1.820,00 104,80 36,40 44,00 2.005,10
Proj. Rec.
`;

  const relatorio = interpretarTextoRelatorioInadimplenciaGestao(texto);
  assert.equal(relatorio.condominioNome, "Residencial Grand Park");
  assert.equal(relatorio.linhas.length, 2);
  assert.deepEqual(
    relatorio.linhas.map((l) => l.unidade),
    ["T1-0402", "T1-0402"],
  );
  assert.match(relatorio.linhas[1]?.categoria ?? "", /CHAMADA DE CAPA/i);
});

test("layout Daniel Jorge — unidades com bloco A/B e categorias OBRA/RESERVA", () => {
  const texto = `
UNIDADES INADIMPLENTES
Condomínio Edifício Solar das Palmeiras Data Base: 10/11/2026
Unidade: A-0104 — Rodrigo Fernandes de Oliveira
TAXA CONDOMINIAL 04/2025 10/04/2025 1.150,00 218,50 23,00 82,45 1.473,95
OBRA FACHADA (02/06) 06/2025 15/06/2025 350,00 59,50 7,00 21,80 438,30
Total 'A-0104': 2.650,00 485,00 53,00 182,37 3.370,37
Unidade: B-0501 — Juliana Martins Peixoto
RESERVA DE ESPAÇO GOURMET 09/2026 20/09/2026 280,00 5,60 5,60 2,10 293,30
TOTAL GERAL ACUMULADO 1.780,00 283,60 35,60 106,35 2.205,55
Proj. Rec.
`;

  assert.ok(textoPareceRelatorioInadimplenciaGestao(texto));
  const relatorio = interpretarTextoRelatorioInadimplenciaGestao(texto);
  assert.equal(relatorio.condominioNome, "Edifício Solar das Palmeiras");
  assert.equal(relatorio.linhas.length, 3);
  assert.deepEqual(
    relatorio.linhas.map((l) => l.unidade),
    ["A-0104", "A-0104", "B-0501"],
  );
  assert.deepEqual(relatorio.totaisGerais, { valorOriginal: "1780.00", total: "2205.55" });
  assert.ok(!relatorio.inconsistencias.some((item) => item.codigo === "financeira.total_geral_divergente"));
});

test("PDF Solar das Palmeiras — extrai condomínio, unidades, responsáveis e totais", async () => {
  const buffer = readFileSync(
    path.join(process.cwd(), "src/test/fixtures/relatorio-inadimplencia-solar-das-palmeiras.pdf"),
  );
  const relatorio = await interpretarPdfInadimplencia(buffer);
  assert.ok(relatorio);
  assert.equal(relatorio.condominioNome, "Edifício Solar das Palmeiras");
  assert.equal(relatorio.linhas.length, 8);
  assert.deepEqual([...new Set(relatorio.linhas.map((l) => l.unidade))].sort(), ["A-0104", "A-0302", "B-0501"]);
  assert.equal(relatorio.linhas[0]?.responsavel, "Rodrigo Fernandes de Oliveira");
  assert.equal(relatorio.totaisGerais?.valorOriginal, "6380.00");
  assert.equal(relatorio.totaisGerais?.total, "7532.62");
  assert.ok(!relatorio.inconsistencias.some((item) => item.codigo === "financeira.total_geral_divergente"));
});
