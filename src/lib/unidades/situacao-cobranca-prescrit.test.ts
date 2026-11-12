import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  CODIGO_SITUACAO_COBRANCA_PRESCRITA,
  SITUACAO_COBRANCA_PADRAO,
  SITUACAO_COBRANCA_PRESCRITA,
  situacaoCobrancaUnidade,
  situacoesUnidade,
  unidadeNaFilaCobrancaAtiva,
  unidadePrescrita,
} from "@/data/catalogo";
import { temPermissao } from "@/lib/permissions/check";
import type { PermissoesCargo } from "@/lib/permissions/modulos";

/** Espelha a validação de situação em `src/lib/unidades/service.ts`. */
function validarSituacaoCobrancaInformada(situacao?: string): string {
  const normalizada = situacaoCobrancaUnidade({ situacao: situacao ?? SITUACAO_COBRANCA_PADRAO });
  if (!situacoesUnidade.includes(normalizada as (typeof situacoesUnidade)[number])) {
    throw new Error("Situação de cobrança inválida.");
  }
  return normalizada;
}

/** Simula filtro de listagem por situação (ex.: `/unidades`, `/debitos`). */
function filtrarPorSituacaoCobranca<T extends { situacao?: string }>(itens: T[], situacaoFiltro: string): T[] {
  if (situacaoFiltro === "todos" || situacaoFiltro === "todas") return itens;
  return itens.filter((item) => situacaoCobrancaUnidade(item) === situacaoFiltro);
}

describe("T01 — situação Unidade prescrita", () => {
  test("catálogo aceita rótulo persistido e alias PRESCRITA", () => {
    assert.ok(situacoesUnidade.includes(SITUACAO_COBRANCA_PRESCRITA));
    assert.equal(situacaoCobrancaUnidade({ situacao: CODIGO_SITUACAO_COBRANCA_PRESCRITA }), SITUACAO_COBRANCA_PRESCRITA);
    assert.ok(unidadePrescrita({ situacao: SITUACAO_COBRANCA_PRESCRITA }));
    assert.equal(unidadeNaFilaCobrancaAtiva({ situacao: SITUACAO_COBRANCA_PRESCRITA }), false);
  });

  test("validação rejeita código inválido e aceita prescrita", () => {
    assert.equal(validarSituacaoCobrancaInformada(SITUACAO_COBRANCA_PRESCRITA), SITUACAO_COBRANCA_PRESCRITA);
    assert.equal(validarSituacaoCobrancaInformada(CODIGO_SITUACAO_COBRANCA_PRESCRITA), SITUACAO_COBRANCA_PRESCRITA);
    assert.throws(() => validarSituacaoCobrancaInformada("PRESCRITA_INVALIDA"), /inválida/);
  });

  test("classificação permanece ao normalizar atualização com outros campos", () => {
    const entrada = {
      situacao: SITUACAO_COBRANCA_PRESCRITA,
      identificacao: "101-A",
    };
    const situacao = validarSituacaoCobrancaInformada(entrada.situacao);
    assert.equal(situacao, SITUACAO_COBRANCA_PRESCRITA);
    assert.equal(entrada.identificacao, "101-A");
  });

  test("filtro retorna somente unidades prescritas", () => {
    const amostra = [
      { id: 1, situacao: "Em cobrança" },
      { id: 2, situacao: SITUACAO_COBRANCA_PRESCRITA },
      { id: 3, situacao: CODIGO_SITUACAO_COBRANCA_PRESCRITA },
      { id: 4, situacao: "Quitada" },
    ];
    const prescritas = filtrarPorSituacaoCobranca(amostra, SITUACAO_COBRANCA_PRESCRITA);
    assert.deepEqual(
      prescritas.map((item) => item.id),
      [2, 3],
    );
  });

  test("perfil sem unidades.editar não pode alterar classificação (contrato de permissão)", () => {
    const somenteLeitura: PermissoesCargo = {
      unidades: { ler: true },
    };
    assert.equal(temPermissao(somenteLeitura, "unidades", "editar"), false);
    const comEdicao: PermissoesCargo = {
      unidades: { ler: true, editar: true },
    };
    assert.equal(temPermissao(comEdicao, "unidades", "editar"), true);
  });
});
