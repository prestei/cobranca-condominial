/**
 * T30 — Central de pendências no dashboard do atendente.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

process.env.NODE_ENV ??= "test";
process.env.AUTH_SECRET ??= "test-auth-secret-min-32-characters!!";

import { getCadastros, resetCadastrosParaTestes, type Atendimento } from "@/data/catalogo";
import {
  classificarTipoPendenciaUnidade,
  contarResumoCentralPendencias,
  listarCentralPendenciasAtendente,
} from "@/lib/dashboard/central-pendencias-atendente";
import { listarFilaCobranca } from "@/lib/fila/service";
import { hojeEmFuso } from "@/lib/notificacoes/timezone";

const ATENDENTE_RAQUEL_ID = 2;

function baseAtendimento(partial: Partial<Atendimento> = {}): Atendimento {
  return {
    id: `t-${Math.random().toString(36).slice(2, 8)}`,
    unidadeId: "1",
    responsavelId: "",
    usuarioId: ATENDENTE_RAQUEL_ID,
    dataHora: "2026-01-10T10:00:00",
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
    retornoCanceladoEm: "",
    retornoCanceladoPorId: null,
    retornoCanceladoMotivo: "",
    ...partial,
  };
}

beforeEach(() => {
  resetCadastrosParaTestes();
});

describe("T30 — classificação de pendências", () => {
  test("prioritária por motivo sensível", () => {
    const filaBase = listarFilaCobranca(ATENDENTE_RAQUEL_ID)[0];
    assert.ok(filaBase, "carteira do atendente precisa de unidade na fila");
    const cadastros = getCadastros();
    cadastros.atendimentos.push(
      baseAtendimento({
        id: "prio-1",
        unidadeId: String(filaBase.unidadeId),
        respondeu: "Sim",
        motivo: "Recusa-se a pagar",
      }),
    );
    const fila = listarFilaCobranca(ATENDENTE_RAQUEL_ID).find((item) => item.unidadeId === filaBase.unidadeId);
    assert.ok(fila);
    const ref = cadastros.atendimentos.find((a) => a.id === "prio-1")!;
    assert.equal(classificarTipoPendenciaUnidade(fila, ref, "2026-03-01"), "prioritarias");
  });

  test("aguardando resposta não é classificado como atrasada", () => {
    const filaBase = listarFilaCobranca(ATENDENTE_RAQUEL_ID)[0];
    assert.ok(filaBase);
    const cadastros = getCadastros();
    cadastros.atendimentos.push(
      baseAtendimento({
        id: "ag-1",
        unidadeId: String(filaBase.unidadeId),
        respondeu: "Não",
        dataHora: "2026-01-01T10:00:00",
      }),
    );
    const fila = listarFilaCobranca(ATENDENTE_RAQUEL_ID).find((item) => item.unidadeId === filaBase.unidadeId);
    const ref = cadastros.atendimentos.find((a) => a.id === "ag-1")!;
    const tipo = classificarTipoPendenciaUnidade(fila!, ref, "2026-03-01");
    assert.equal(tipo, "aguardando_resposta");
    assert.notEqual(tipo, "atrasadas");
  });

  test("retorno atrasado vira pendência atrasada", () => {
    const filaBase = listarFilaCobranca(ATENDENTE_RAQUEL_ID)[0];
    assert.ok(filaBase);
    const cadastros = getCadastros();
    cadastros.atendimentos.push(
      baseAtendimento({
        id: "atr-1",
        unidadeId: String(filaBase.unidadeId),
        respondeu: "Sim",
        motivo: "Esqueceu o vencimento",
        dataProximaAcao: "2026-02-01",
      }),
    );
    const fila = listarFilaCobranca(ATENDENTE_RAQUEL_ID).find((item) => item.unidadeId === filaBase.unidadeId);
    const ref = cadastros.atendimentos.find((a) => a.id === "atr-1")!;
    assert.equal(classificarTipoPendenciaUnidade(fila!, ref, "2026-03-01"), "atrasadas");
  });
});

describe("T30 — listagem e paginação", () => {
  test("resumo bate com registros únicos por unidade", () => {
    const resumo = contarResumoCentralPendencias(ATENDENTE_RAQUEL_ID);
    const totalResumo = Object.values(resumo).reduce((s, n) => s + n, 0);
    const lista = listarCentralPendenciasAtendente(ATENDENTE_RAQUEL_ID, {
      categoria: "todas",
      page: 1,
      pageSize: 100,
    });
    assert.equal(lista.total, totalResumo);
    const ids = new Set(lista.itens.map((item) => item.unidadeId));
    assert.equal(ids.size, lista.itens.length);
  });

  test("paginação não duplica registros entre páginas", () => {
    const page1 = listarCentralPendenciasAtendente(ATENDENTE_RAQUEL_ID, { page: 1, pageSize: 2 });
    const page2 = listarCentralPendenciasAtendente(ATENDENTE_RAQUEL_ID, { page: 2, pageSize: 2 });
    const ids1 = new Set(page1.itens.map((item) => item.unidadeId));
    for (const item of page2.itens) {
      assert.equal(ids1.has(item.unidadeId), false);
    }
  });

  test("data de referência usa fuso operacional", () => {
    const resultado = listarCentralPendenciasAtendente(ATENDENTE_RAQUEL_ID);
    assert.equal(resultado.hoje, hojeEmFuso());
    assert.ok(resultado.fuso.length > 0);
  });
});
