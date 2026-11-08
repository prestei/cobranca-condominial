import assert from "node:assert/strict";
import test from "node:test";
import {
  importacaoGravacaoSemExclusaoPorProblema,
  resolverSituacaoFinalImportacao,
} from "@/lib/importacao-centro/situacao-importacao";

test("resolverSituacaoFinalImportacao: duplicados com gravação = Concluida", () => {
  const sit = resolverSituacaoFinalImportacao({
    contadores: {
      novos: 390,
      atualizacoes: 0,
      duplicados: 1,
      erros: 0,
      manualProtegido: 0,
      ignorados: 0,
      revisoes: 0,
    },
    importacaoParcial: true,
  });
  assert.equal(sit, "Concluida");
});

test("resolverSituacaoFinalImportacao: erros com gravação = Concluida parcialmente", () => {
  const sit = resolverSituacaoFinalImportacao({
    contadores: {
      novos: 10,
      atualizacoes: 0,
      duplicados: 0,
      erros: 2,
      manualProtegido: 0,
      ignorados: 0,
      revisoes: 0,
    },
    importacaoParcial: true,
  });
  assert.equal(sit, "Concluida parcialmente");
});

test("importacaoGravacaoSemExclusaoPorProblema ignora duplicados", () => {
  assert.equal(
    importacaoGravacaoSemExclusaoPorProblema({
      novos: 5,
      atualizados: 0,
      erros: 0,
      manualProtegido: 0,
    }),
    true,
  );
});
