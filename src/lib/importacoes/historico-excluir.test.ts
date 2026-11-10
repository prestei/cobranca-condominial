import assert from "node:assert/strict";
import test from "node:test";
import { getCadastros, resetCadastrosParaTestes } from "@/data/catalogo-store";
import { criarImportacaoEmProcessamento } from "@/lib/importacao-centro/historico-auditoria";
import { excluirImportacaoHistorico } from "@/lib/importacoes/historico-service";

test("excluirImportacaoHistorico remove registro do servidor", async () => {
  resetCadastrosParaTestes();
  const registro = criarImportacaoEmProcessamento({
    processoId: "00000000-0000-4000-8000-000000000099",
    userId: 1,
    modulo: "debitos",
    arquivo: "teste.csv",
  });
  const antes = getCadastros().importacoes.length;
  await excluirImportacaoHistorico(1, registro.id);
  assert.equal(getCadastros().importacoes.length, antes - 1);
  assert.equal(getCadastros().importacoes.some((item) => item.id === registro.id), false);
});
