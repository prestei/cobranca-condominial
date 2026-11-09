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
});
