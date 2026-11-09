import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { interpretarPdfInadimplencia } from "@/lib/importacoes/inadimplencia/pdf-para-matriz-inadimplencia";

const FIXTURE_PDF = path.join(
  process.cwd(),
  "src/test/fixtures/relatorio-inadimplencia-daniel-jorge-advocacia.pdf",
);

test("PDF Daniel Jorge Advocacia — detecta layout e extrai débitos da amostra", () => {
  const buffer = readFileSync(FIXTURE_PDF);
  const relatorio = interpretarPdfInadimplencia(buffer);
  assert.ok(relatorio, "deve reconhecer relatório sem marca Gestão Condominial");
  assert.equal(relatorio.condominioNome, "Residencial do Mar");
  assert.ok(relatorio.linhas.length >= 8, "amostra de 1 página contém vários lançamentos");
  const mb0102 = relatorio.linhas.filter((l) => l.unidade === "MB-0102");
  assert.ok(mb0102.length >= 4);
  assert.equal(mb0102[0]?.responsavel, "Gleide Nunes Rocha");
});
