import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { SITUACAO_COBRANCA_PADRAO, type Unidade } from "@/data/catalogo";
import {
  rotuloSituacaoListagemUnidade,
  variantBadgeSituacaoListagemUnidade,
} from "@/lib/unidades/situacao-listagem";

function unidadeBase(partial: Partial<Unidade> = {}): Unidade {
  return {
    id: 1,
    condominioId: 1,
    identificacao: "101",
    bloco: "",
    tipo: "Apartamento",
    status: "Ativa",
    situacao: SITUACAO_COBRANCA_PADRAO,
    ...partial,
  };
}

describe("rotuloSituacaoListagemUnidade", () => {
  test("prioriza inadimplente operacional", () => {
    const u = unidadeBase({ situacao: "Em cobrança" });
    assert.equal(rotuloSituacaoListagemUnidade(u, true, true), "Inadimplente");
  });

  test("exibe inadimplência prescrita sem débito operacional", () => {
    const u = unidadeBase({ situacao: "Sem cobrança" });
    assert.equal(rotuloSituacaoListagemUnidade(u, false, true), "Inadimplência prescrita");
  });

  test("aguardando débitos na fila sem saldo operacional", () => {
    const u = unidadeBase({ situacao: "Em cobrança" });
    assert.equal(rotuloSituacaoListagemUnidade(u, false, false), "Aguardando débitos");
  });

  test("em dia fora da fila", () => {
    const u = unidadeBase({ situacao: "Sem cobrança" });
    assert.equal(rotuloSituacaoListagemUnidade(u, false, false), "Em dia");
  });

  test("variantes de badge", () => {
    assert.equal(variantBadgeSituacaoListagemUnidade("Em dia"), "success");
    assert.equal(variantBadgeSituacaoListagemUnidade("Inadimplente"), "error");
    assert.equal(variantBadgeSituacaoListagemUnidade("Inadimplência prescrita"), "secondary");
  });
});