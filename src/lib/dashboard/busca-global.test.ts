import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { getCadastros } from "@/data/catalogo-store";
import { buscarGlobalDashboard, BuscaGlobalError } from "@/lib/dashboard/busca-global";
import { montarExportacaoCarteiraDashboard, ExportarCarteiraError } from "@/lib/dashboard/exportar-carteira";

const ADMIN_ID = 1;
const ATENDENTE_RAQUEL_ID = 3;

describe("T35 — busca global da carteira", () => {
  test("exige termo mínimo", async () => {
    await assert.rejects(
      () => buscarGlobalDashboard(ADMIN_ID, "a", getCadastros()),
      (err: unknown) => err instanceof BuscaGlobalError && err.status === 400,
    );
  });

  test("atendente não encontra cobrança fora da carteira", async () => {
    const fora = getCadastros().unidades.find((u) => {
      const vigente = getCadastros().atribuicoesCobranca.find((a) => a.unidadeId === u.id && !a.encerradoEm);
      return vigente && vigente.atendenteId !== ATENDENTE_RAQUEL_ID;
    });
    assert.ok(fora, "seed precisa de unidade atribuída a outro RE");
    const resultado = await buscarGlobalDashboard(
      ATENDENTE_RAQUEL_ID,
      fora.identificacao.length >= 2 ? fora.identificacao : `${fora.identificacao}x`,
      getCadastros(),
    );
    const cobrancas = resultado.categorias.find((c) => c.id === "cobrancas")?.itens ?? [];
    assert.ok(!cobrancas.some((item) => item.id === `cobranca:${fora.id}`));
  });

  test("admin localiza condomínio no escopo", async () => {
    const condo = getCadastros().condominios[0];
    assert.ok(condo);
    const resultado = await buscarGlobalDashboard(ADMIN_ID, condo.nome.slice(0, 4), getCadastros());
    const condominios = resultado.categorias.find((c) => c.id === "condominios")?.itens ?? [];
    assert.ok(condominios.some((item) => item.id === `condominio:${condo.id}`));
  });
});

describe("T35 — exportação da carteira", () => {
  test("exportação fila inclui metadados e respeita escopo", async () => {
    const params = new URLSearchParams();
    const payload = await montarExportacaoCarteiraDashboard(ATENDENTE_RAQUEL_ID, "fila", params, undefined, getCadastros());
    assert.ok(payload.meta.geradoEm.length > 0);
    assert.equal(payload.secoes[0]?.titulo.includes("Fila"), true);
    const auditoria = getCadastros().auditoria.find((item) => item.entidade === "dashboard_export");
    assert.ok(auditoria);
  });

  test("condomínio fora do escopo bloqueia exportação", async () => {
    const params = new URLSearchParams();
    params.set("condominioId", "999999");
    await assert.rejects(
      () => montarExportacaoCarteiraDashboard(ATENDENTE_RAQUEL_ID, "fila", params, undefined, getCadastros()),
      (err: unknown) => err instanceof ExportarCarteiraError && err.status === 403,
    );
  });
});
