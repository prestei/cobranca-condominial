/**
 * T28 — indicadores operacionais do dashboard do atendente.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

process.env.NODE_ENV ??= "test";
process.env.AUTH_SECRET ??= "test-auth-secret-min-32-characters!!";

import { type Atendimento } from "@/data/catalogo";
import { resetCadastrosParaTestes } from "@/data/catalogo-store";
import {
  aguardandoRetornoTerceiro,
  atendimentoPendenteAcao,
  atendimentoPrecisaAtencao,
  classificarAtendimentoOperacional,
  contarIndicadoresOperacionaisAtendente,
  listarAtendimentosIndicadorOperacional,
  resolvidoNoPeriodo,
} from "@/lib/dashboard/indicadores-operacionais-atendente";
import { obterDashboard } from "@/lib/dashboard/service";

const ATENDENTE_RAQUEL_ID = 2;

function baseAtendimento(partial: Partial<Atendimento> = {}): Atendimento {
  return {
    id: "t1",
    unidadeId: "1",
    responsavelId: "",
    usuarioId: ATENDENTE_RAQUEL_ID,
    dataHora: "2026-01-10T10:00:00.000Z",
    canal: "Telefone",
    respondeu: "Não",
    motivo: "",
    assunto: "",
    descricao: "",
    status: "Pendente",
    dataProximaAcao: "",
    proximaAcao: "",
    retornoConcluidoEm: "",
    retornoConcluidoPorId: null,
    ...partial,
  };
}

const periodo = { inicio: "2026-01-01", fim: "2026-01-31" };

beforeEach(() => {
  resetCadastrosParaTestes();
});

describe("T28 — classificação operacional", () => {
  test("aguardando retorno quando não houve resposta", () => {
    const item = baseAtendimento({ respondeu: "Não" });
    assert.equal(aguardandoRetornoTerceiro(item), true);
    assert.equal(classificarAtendimentoOperacional(item, periodo, "2026-01-15"), "aguardando_retorno");
  });

  test("atenção em retorno atrasado não concluído", () => {
    const item = baseAtendimento({
      respondeu: "Sim",
      motivo: "Dificuldade financeira",
      dataProximaAcao: "2026-01-01T10:00:00",
    });
    assert.equal(atendimentoPrecisaAtencao(item, "2026-01-15"), true);
    assert.equal(classificarAtendimentoOperacional(item, periodo, "2026-01-15"), "atencao");
  });

  test("pendente de ação quando respondeu e não aguarda terceiro", () => {
    const item = baseAtendimento({
      respondeu: "Sim",
      motivo: "Esqueceu o vencimento",
      status: "Pendente",
    });
    assert.equal(atendimentoPendenteAcao(item, "2026-01-15"), true);
    assert.equal(classificarAtendimentoOperacional(item, periodo, "2026-01-15"), "pendentes");
  });

  test("resolvido no período por status ou conclusão de retorno", () => {
    const resolvido = baseAtendimento({ status: "Resolvido", dataHora: "2026-01-12T10:00:00.000Z" });
    const concluido = baseAtendimento({
      status: "Pendente",
      retornoConcluidoEm: "2026-01-12T15:00:00.000Z",
    });
    assert.equal(resolvidoNoPeriodo(resolvido, periodo.inicio, periodo.fim), true);
    assert.equal(resolvidoNoPeriodo(concluido, periodo.inicio, periodo.fim), true);
  });

  test("atenção tem prioridade sobre aguardando retorno", () => {
    const item = baseAtendimento({
      respondeu: "Sim",
      motivo: "Já pagou (enviar comprovante)",
      dataProximaAcao: "2026-01-01",
    });
    assert.equal(classificarAtendimentoOperacional(item, periodo, "2026-01-15"), "atencao");
    assert.equal(aguardandoRetornoTerceiro(item), true);
  });
});

describe("T28 — dashboard e listagem", () => {
  test("payload do atendente inclui quatro indicadores", () => {
    const dash = obterDashboard(ATENDENTE_RAQUEL_ID);
    assert.equal(dash.perfil, "atendente");
    assert.equal(dash.indicadoresOperacionais.itens.length, 4);
  });

  test("totais batem com a listagem por indicador", () => {
    const resultado = contarIndicadoresOperacionaisAtendente(ATENDENTE_RAQUEL_ID);
    for (const linha of resultado.itens) {
      const lista = listarAtendimentosIndicadorOperacional(ATENDENTE_RAQUEL_ID, linha.id, resultado.periodo);
      assert.equal(lista.length, linha.total);
    }
  });
});
