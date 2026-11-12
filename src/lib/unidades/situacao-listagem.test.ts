import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { SITUACAO_COBRANCA_PRESCRITA } from "@/data/catalogo";
import type { Unidade } from "@/data/catalogo";
import {
  rotuloSituacaoListagemUnidade,
  variantBadgeSituacaoListagemUnidade,
} from "@/lib/unidades/situacao-listagem";

function unidadeBase(overrides: Partial<Unidade> = {}): Unidade {
  return {
    id: 1,
    condominioId: 1,
    identificacao: "101",
    situacao: "Em cobrança",
    status: "Ativa",
    ...overrides,
  } as Unidade;
}

describe("rotuloSituacaoListagemUnidade", () => {
  test("prioriza Unidade prescrita", () => {
    const u = unidadeBase({ situacao: SITUACAO_COBRANCA_PRESCRITA });
    assert.equal(rotuloSituacaoListagemUnidade(u, true), "Unidade prescrita");
    assert.equal(rotuloSituacaoListagemUnidade(u, false), "Unidade prescrita");
  });

  test("inadimplente quando há débito vencido/pendente operacional", () => {
    const u = unidadeBase({ situacao: "Em cobrança" });
    assert.equal(rotuloSituacaoListagemUnidade(u, true), "Inadimplente");
  });

  test("aguardando débitos na fila ativa sem débito aberto", () => {
    const u = unidadeBase({ situacao: "Em cobrança" });
    assert.equal(rotuloSituacaoListagemUnidade(u, false), "Aguardando débitos");
  });

  test("em dia quando quitada e sem débito aberto", () => {
    const u = unidadeBase({ situacao: "Quitada" });
    assert.equal(rotuloSituacaoListagemUnidade(u, false), "Em dia");
  });

  test("variantes de badge alinhadas aos rótulos", () => {
    assert.equal(variantBadgeSituacaoListagemUnidade("Em dia"), "success");
    assert.equal(variantBadgeSituacaoListagemUnidade("Inadimplente"), "error");
    assert.equal(variantBadgeSituacaoListagemUnidade("Aguardando débitos"), "secondary");
    assert.equal(variantBadgeSituacaoListagemUnidade("Unidade prescrita"), "secondary");
  });
});
