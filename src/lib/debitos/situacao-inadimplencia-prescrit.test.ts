import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  CODIGO_SITUACAO_INADIMPLENCIA_PRESCRITA,
  debitoEmAbertoOperacional,
  debitoPrescrito,
  SITUACAO_INADIMPLENCIA_ATIVA,
  SITUACAO_INADIMPLENCIA_PRESCRITA,
  situacaoInadimplenciaDebito,
  situacoesInadimplencia,
} from "@/data/catalogo";
import { temPermissao } from "@/lib/permissions/check";
import type { PermissoesCargo } from "@/lib/permissions/modulos";

function filtrarPorSituacaoInadimplencia<T extends { situacaoInadimplencia?: string }>(
  itens: T[],
  situacaoFiltro: string,
): T[] {
  if (situacaoFiltro === "todas" || situacaoFiltro === "todos") return itens;
  return itens.filter((item) => situacaoInadimplenciaDebito(item) === situacaoFiltro);
}

describe("T08 — inadimplência prescrita no débito", () => {
  test("catálogo aceita rótulo persistido e alias PRESCRITA", () => {
    assert.ok(situacoesInadimplencia.includes(SITUACAO_INADIMPLENCIA_PRESCRITA));
    assert.equal(
      situacaoInadimplenciaDebito({ situacaoInadimplencia: CODIGO_SITUACAO_INADIMPLENCIA_PRESCRITA }),
      SITUACAO_INADIMPLENCIA_PRESCRITA,
    );
    assert.ok(debitoPrescrito({ situacaoInadimplencia: SITUACAO_INADIMPLENCIA_PRESCRITA }));
    assert.equal(debitoEmAbertoOperacional({ status: "Vencido", situacaoInadimplencia: SITUACAO_INADIMPLENCIA_PRESCRITA }), false);
    assert.equal(debitoEmAbertoOperacional({ status: "Vencido", situacaoInadimplencia: SITUACAO_INADIMPLENCIA_ATIVA }), true);
  });

  test("filtro retorna somente inadimplências prescritas", () => {
    const amostra = [
      { id: 1, situacaoInadimplencia: SITUACAO_INADIMPLENCIA_ATIVA },
      { id: 2, situacaoInadimplencia: SITUACAO_INADIMPLENCIA_PRESCRITA },
      { id: 3, situacaoInadimplencia: CODIGO_SITUACAO_INADIMPLENCIA_PRESCRITA },
    ];
    const prescritas = filtrarPorSituacaoInadimplencia(amostra, SITUACAO_INADIMPLENCIA_PRESCRITA);
    assert.deepEqual(
      prescritas.map((item) => item.id),
      [2, 3],
    );
  });

  test("débito prescrito não entra na cobrança operacional", () => {
    assert.ok(debitoEmAbertoOperacional({ status: "Vencido", situacaoInadimplencia: SITUACAO_INADIMPLENCIA_ATIVA }));
    assert.ok(!debitoEmAbertoOperacional({ status: "Vencido", situacaoInadimplencia: SITUACAO_INADIMPLENCIA_PRESCRITA }));
  });

  test("perfil sem debitos.editar não pode classificar prescrição (contrato de permissão)", () => {
    const somenteLeitura: PermissoesCargo = {
      debitos: { ler: true },
    };
    assert.equal(temPermissao(somenteLeitura, "debitos", "editar"), false);
    const comEdicao: PermissoesCargo = {
      debitos: { ler: true, editar: true },
    };
    assert.equal(temPermissao(comEdicao, "debitos", "editar"), true);
  });
});