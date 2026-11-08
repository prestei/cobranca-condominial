/**
 * T32 — gráficos de inadimplência e distribuição da carteira (atendente).
 */
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

process.env.NODE_ENV ??= "test";
process.env.AUTH_SECRET ??= "test-auth-secret-min-32-characters!!";

import { getCadastros, resetCadastrosParaTestes } from "@/data/catalogo";
import {
  FAIXAS_ATRASO_DASHBOARD_ATENDENTE,
  classificarSituacaoCarteiraUnidade,
  montarGraficosAtendente,
  vencimentoParaFaixaDashboard,
} from "@/lib/dashboard/graficos-atendente";
import { obterDashboard } from "@/lib/dashboard/service";

const ATENDENTE_RAQUEL_ID = 2;
const DATA_BASE = "2026-03-15";

beforeEach(() => {
  resetCadastrosParaTestes();
});

describe("T32 — faixas de atraso", () => {
  test("quatro faixas documentadas e soma igual ao total sem duplicar débito", () => {
    const graficos = montarGraficosAtendente(ATENDENTE_RAQUEL_ID, { dataBase: DATA_BASE, limiteDias: 60 });
    assert.ok(graficos);
    assert.equal(graficos.faixasAtraso.length, FAIXAS_ATRASO_DASHBOARD_ATENDENTE.length);
    const somaFaixas = graficos.faixasAtraso.reduce((acc, item) => acc + item.valor, 0);
  const debitosCarteira = graficos.totais.debitosConsiderados;
    assert.ok(debitosCarteira >= 0);
    if (somaFaixas > 0) {
      const somaQuantidade = graficos.faixasAtraso.reduce((acc, item) => acc + item.quantidade, 0);
      assert.equal(somaQuantidade, debitosCarteira);
    }
  });

  test("vencimentoParaFaixaDashboard gera intervalos coerentes", () => {
    const ate30 = vencimentoParaFaixaDashboard("ate_30", DATA_BASE);
    assert.ok(ate30?.vencimentoAte);
    assert.ok(ate30?.vencimentoDe);

    const acima90 = vencimentoParaFaixaDashboard("acima_90", DATA_BASE);
    assert.ok(acima90?.vencimentoAte);
  });
});

describe("T32 — classificação por situação", () => {
  test("unidade em acordo entra em negociação", () => {
    const unidade = getCadastros().unidades[0];
    assert.ok(unidade);
    getCadastros().unidades[0] = { ...unidade, situacao: "Em acordo" };
    const cat = classificarSituacaoCarteiraUnidade(ATENDENTE_RAQUEL_ID, getCadastros().unidades[0]);
    assert.equal(cat, "em_negociacao");
  });
});

describe("T32 — payload do dashboard", () => {
  test("perfil atendente inclui bloco graficos", () => {
    const dash = obterDashboard(ATENDENTE_RAQUEL_ID, { dataBase: DATA_BASE });
    assert.equal(dash.perfil, "atendente");
    if (dash.perfil !== "atendente") return;
    assert.ok(dash.graficos);
    assert.ok(dash.graficos.evolucaoMensal.length === 12);
    assert.ok(dash.graficos.regras.faixasAtraso.includes("diasDeAtraso"));
  });
});
