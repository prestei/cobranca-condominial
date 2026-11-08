import assert from "node:assert/strict";
import test from "node:test";
import { _limparTodosProcessosTemporariosParaTeste } from "./armazenamento-temporario.ts";
import { RecebimentoArquivoError, receberArquivoImportacao } from "./receber-arquivo.ts";

const CABECALHO_DEBITOS =
  "Unidade;Condomínio;Referência;Vencimento;Valor atualizado\n";

test.beforeEach(() => {
  _limparTodosProcessosTemporariosParaTeste();
});

test("rejeita extensão incompatível com o conteúdo", async () => {
  const buffer = Buffer.from(`${CABECALHO_DEBITOS}101;Residencial;09/2026;2026-09-10;150,00\n`, "utf8");
  await assert.rejects(
    () =>
      receberArquivoImportacao({
        userId: 1,
        modulo: "debitos",
        nomeArquivo: "dados.xlsx",
        buffer,
      }),
    (err) => err instanceof RecebimentoArquivoError && err.codigo === "extensao_incompativel",
  );
});

test("rejeita arquivo vazio", async () => {
  await assert.rejects(
    () =>
      receberArquivoImportacao({
        userId: 1,
        modulo: "debitos",
        nomeArquivo: "vazio.csv",
        buffer: Buffer.alloc(0),
      }),
    (err) => err instanceof RecebimentoArquivoError && err.codigo === "arquivo_vazio",
  );
});

test("aceita CSV válido e retorna processoId", async () => {
  const buffer = Buffer.from(`${CABECALHO_DEBITOS}101;Residencial;09/2026;2026-09-10;150,00\n`, "utf8");
  const resultado = await receberArquivoImportacao({
    userId: 1,
    modulo: "debitos",
    nomeArquivo: "inadimplencia.csv",
    buffer,
    mimeDeclarado: "text/csv",
  });
  assert.ok(resultado.processoId);
  assert.equal(resultado.formato, "csv");
  assert.ok(resultado.hashArquivo);
});
