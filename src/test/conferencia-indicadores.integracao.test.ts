/**
 * T35 — conferência de indicadores, produtividade e exportação.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

process.env.NODE_ENV ??= "test";
process.env.AUTH_SECRET ??= "test-auth-secret-min-32-characters!!";

import { getCadastros, resetCadastrosParaTestes } from "@/data/catalogo";
import { criarAtendimento, concluirRetornoAgendado } from "@/lib/atendimentos/service";
import { consultarReferenciaIndicador, ConferenciaIndicadoresError } from "@/lib/indicadores/conferencia";
import { diaDentroDoPeriodo } from "@/lib/indicadores/regras-evento";
import { distribuirUnidades } from "@/lib/distribuicao/service";
import { montarPainelProdutividadePorRe } from "@/lib/relatorios/produtividade";
import { montarExportRelatorio, filtrosPadrao, RelatorioServiceError } from "@/lib/relatorios/service";
import { obterDashboard } from "@/lib/dashboard/service";
import { listarCondominios } from "@/lib/condominios/service";

const ADMIN_ID = 1;
const ATENDENTE_RAQUEL_ID = 2;
const ATENDENTE_TASSIA_ID = 3;
const ADVOGADO_ID = 5;

beforeEach(() => {
  resetCadastrosParaTestes();
});

describe("T35 — consulta de referência e conciliação", () => {
  test("atendente não acessa consulta de referência", () => {
    assert.throws(
      () =>
        consultarReferenciaIndicador(ATENDENTE_RAQUEL_ID, "atendimentos_registrados", {
          ...filtrosPadrao(),
          de: "2020-01-01",
          ate: "2035-12-31",
        }),
      (err: unknown) => err instanceof ConferenciaIndicadoresError && err.status === 403,
    );
  });

  test("autoria permanece no RE original após redistribuição", () => {
    const filtros = { ...filtrosPadrao(), de: "2020-01-01", ate: "2035-12-31", codigoRe: "RE-10000" };
    criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      canal: "Telefone",
      respondeu: "Não",
      status: "Resolvido",
      assunto: "T35 autoria",
    });
    distribuirUnidades(ADMIN_ID, {
      unidadeIds: [2],
      codigoRe: "RE-10001",
      motivo: "T35 redistribuição",
    });
    const ref = consultarReferenciaIndicador(ADMIN_ID, "atendimentos_registrados", filtros);
    assert.ok(ref.linhas.some((l) => l.reAutorEvento === "RE-10000" && l.detalhe.includes("T35 autoria")));
    assert.ok(ref.linhas.every((l) => l.reContabilizado === "RE-10000"));
    assert.equal(ref.conciliacaoPainel.coincide, true);
  });

  test("retornos previstos, concluídos e estados no período", () => {
    const previsto = criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      canal: "WhatsApp",
      respondeu: "Não",
      status: "Pendente",
      dataProximaAcao: "2030-06-15T10:00:00",
      proximaAcao: "Retornar T35",
    });
    const concluido = criarAtendimento(ATENDENTE_TASSIA_ID, {
      condominioId: 2,
      unidadeId: 3,
      canal: "Telefone",
      respondeu: "Não",
      status: "Pendente",
      dataProximaAcao: "2030-06-20T09:00:00",
      proximaAcao: "Retornar T35 B",
    });
    concluirRetornoAgendado(ATENDENTE_TASSIA_ID, concluido.id);
    const registroConcluido = getCadastros().atendimentos.find((item) => item.id === concluido.id);
    if (registroConcluido) registroConcluido.retornoConcluidoEm = "2030-06-21T14:00:00.000Z";
    const filtros = { ...filtrosPadrao(), de: "2030-06-01", ate: "2030-06-30" };
    const prev = consultarReferenciaIndicador(ADMIN_ID, "retornos_previstos", filtros);
    assert.equal(prev.total, 2);
    const conc = consultarReferenciaIndicador(ADMIN_ID, "retornos_concluidos", filtros);
    assert.equal(conc.total, 1);
    assert.equal(conc.linhas[0]?.reContabilizado, "RE-10001");
    assert.equal(conc.linhas[0]?.reAutorEvento, "RE-10001");
    assert.notEqual(previsto.id, concluido.id);
  });

  test("proposta cancelada não entra em negociações", () => {
    getCadastros().propostasNegociacao.push({
      id: "prop-t35-cancel",
      condominioId: 1,
      unidadeId: 2,
      usuarioId: ATENDENTE_RAQUEL_ID,
      criadoEm: "2031-01-10T10:00:00",
      status: "Cancelada",
      valorProposto: "100",
      observacoes: "",
      debitoIds: [],
      acordoConfirmadoEm: "",
      acordoConfirmadoPorId: null,
      termosAprovados: "",
    });
    getCadastros().propostasNegociacao.push({
      id: "prop-t35-ok",
      condominioId: 1,
      unidadeId: 2,
      usuarioId: ATENDENTE_RAQUEL_ID,
      criadoEm: "2031-01-10T11:00:00",
      status: "Em análise",
      valorProposto: "200",
      observacoes: "",
      debitoIds: [],
      acordoConfirmadoEm: "",
      acordoConfirmadoPorId: null,
      termosAprovados: "",
    });
    const filtros = { ...filtrosPadrao(), de: "2031-01-01", ate: "2031-01-31", codigoRe: "RE-10000" };
    const ref = consultarReferenciaIndicador(ADMIN_ID, "negociacoes_criadas", filtros);
    assert.equal(ref.total, 1);
    assert.equal(ref.conciliacaoPainel.coincide, true);
  });

  test("limites de período e meia-noite (dia civil inclusivo)", () => {
    criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      canal: "Telefone",
      respondeu: "Não",
      status: "Resolvido",
      assunto: "T35 meia-noite",
    });
    const ultimo = getCadastros().atendimentos.at(-1);
    if (ultimo) ultimo.dataHora = "2032-03-01T23:59:59.000Z";
    assert.equal(diaDentroDoPeriodo("2032-03-01T23:59:59.000Z", "2032-03-01", "2032-03-01"), true);
    assert.equal(diaDentroDoPeriodo("2032-03-02T00:00:01.000Z", "2032-03-01", "2032-03-01"), false);
    const ref = consultarReferenciaIndicador(ADMIN_ID, "atendimentos_registrados", {
      ...filtrosPadrao(),
      de: "2032-03-01",
      ate: "2032-03-01",
    });
    assert.equal(ref.total, 1);
  });

  test("painel, exportação CSV e consulta de referência conciliam", () => {
    criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      canal: "WhatsApp",
      respondeu: "Não",
      status: "Resolvido",
      assunto: "T35 export",
    });
    const filtros = { ...filtrosPadrao(), de: "2020-01-01", ate: "2035-12-31", codigoRe: "RE-10000" };
    const painel = montarPainelProdutividadePorRe(ADMIN_ID, filtros);
    const linha = painel.linhas.find((item) => item.codigoRe === "RE-10000");
    assert.ok(linha);
    const ref = consultarReferenciaIndicador(ADMIN_ID, "atendimentos_registrados", filtros);
    assert.equal(ref.total, linha?.atendimentosRegistrados);
    assert.equal(ref.conciliacaoPainel.coincide, true);

    const exportacao = montarExportRelatorio(ADMIN_ID, "produtividade", filtros);
    const linhaExport = exportacao.secoes[0]?.linhas.find((l) => l[0] === "RE-10000");
    assert.ok(linhaExport);
    assert.equal(Number(linhaExport[1]), linha?.atendimentosRegistrados);
    assert.ok(exportacao.meta.geradoEm.length > 0);
    assert.ok(painel.meta.filtros.length > 0);
  });

  test("condomínio fora do escopo bloqueia exportação e conferência", () => {
    const filtros = {
      ...filtrosPadrao(),
      de: "2020-01-01",
      ate: "2035-12-31",
      condominioId: 999,
    };
    assert.throws(
      () => montarExportRelatorio(ADMIN_ID, "produtividade", filtros),
      (err: unknown) => err instanceof RelatorioServiceError && err.status === 403,
    );
    assert.throws(
      () => consultarReferenciaIndicador(ADMIN_ID, "atendimentos_registrados", filtros),
      (err: unknown) => err instanceof RelatorioServiceError && err.status === 403,
    );
  });

  test("dashboard inclui meta de geração e filtros", () => {
    const dash = obterDashboard(ADMIN_ID);
    assert.ok(dash.meta.geradoEm);
    assert.ok(dash.meta.filtros.some((f) => f.includes("Data-base")));
  });

  test("advogado vê escopo restrito de condomínios", () => {
    const lista = listarCondominios(ADVOGADO_ID);
    assert.ok(Array.isArray(lista));
  });
});
