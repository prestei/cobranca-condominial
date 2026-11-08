import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { getCadastros } from "@/data/catalogo";
import {
  filtrosDashboardPadrao,
  parseFiltrosDashboard,
  resolverUnidadesDashboard,
  validarFiltrosDashboardEscopo,
  DashboardFiltrosError,
} from "@/lib/dashboard/filtros";

const ATENDENTE_RAQUEL_ID = 3;

describe("T33 — filtros do dashboard", () => {
  test("período padrão são os últimos 7 dias", () => {
    const filtros = filtrosDashboardPadrao("2026-03-01");
    assert.equal(filtros.periodo?.preset, "7");
    assert.equal(filtros.periodoResolvido.inicio, "2026-02-23");
    assert.equal(filtros.periodoResolvido.fim, "2026-03-01");
  });

  test("período personalizado respeita limites", () => {
    const params = new URLSearchParams();
    params.set("periodo", "personalizado");
    params.set("de", "2026-01-10");
    params.set("ate", "2026-01-20");
    const filtros = parseFiltrosDashboard(params, "2026-03-01");
    assert.equal(filtros.periodoResolvido.inicio, "2026-01-10");
    assert.equal(filtros.periodoResolvido.fim, "2026-01-20");
  });

  test("condomínio fora do escopo é rejeitado", () => {
    const filtros = { ...filtrosDashboardPadrao(), condominioId: 999_999 };
    assert.throws(
      () => validarFiltrosDashboardEscopo(ATENDENTE_RAQUEL_ID, filtros),
      (err: unknown) => err instanceof DashboardFiltrosError && err.status === 403,
    );
  });

  test("combinação condomínio + busca restringe unidades na carteira", () => {
    const params = new URLSearchParams();
    params.set("condominioId", "1");
    params.set("q", "101");
    const filtros = parseFiltrosDashboard(params, "2026-03-01");
    validarFiltrosDashboardEscopo(ATENDENTE_RAQUEL_ID, filtros);
    const unidades = resolverUnidadesDashboard(ATENDENTE_RAQUEL_ID, filtros);
    assert.ok(unidades);
    for (const id of unidades) {
      const unidade = getCadastros().unidades.find((item) => item.id === id);
      assert.ok(unidade);
      assert.equal(unidade.condominioId, 1);
    }
  });
});
