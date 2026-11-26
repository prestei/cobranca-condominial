import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Cadastros, Unidade } from "@/data/catalogo";
import { situacaoOperacionalFila } from "@/lib/fila/situacao-operacional";
import { SITUACAO_OPERACIONAL_EM_NEGOCIACAO } from "@/lib/debitos/operational-situation";

function unidadeBase(overrides: Partial<Unidade> = {}): Unidade {
  return {
    id: 1,
    condominioId: 10,
    identificacao: "101",
    bloco: "",
    tipo: "Apartamento",
    status: "Ativa",
    situacao: "Em cobrança",
    ...overrides,
  } as Unidade;
}

function cadastrosBase(overrides: Partial<Cadastros> = {}): Cadastros {
  return {
    unidades: [],
    debitos: [],
    propostasNegociacao: [],
    atendimentos: [],
    atribuicoesCobranca: [],
    condominios: [],
    usuarios: [],
    ...overrides,
  } as Cadastros;
}

describe("situação operacional da fila", () => {
  test("sem atribuição → Novo", () => {
    const unidade = unidadeBase();
    const cadastros = cadastrosBase({ unidades: [unidade] });
    assert.equal(situacaoOperacionalFila(cadastros, unidade, false), "Novo");
  });

  test("com atribuição → Em cobrança", () => {
    const unidade = unidadeBase();
    const cadastros = cadastrosBase({ unidades: [unidade] });
    assert.equal(situacaoOperacionalFila(cadastros, unidade, true), "Em cobrança");
  });

  test("proposta encaminhada à fila de negociação → Em negociação", () => {
    const unidade = unidadeBase();
    const cadastros = cadastrosBase({
      unidades: [unidade],
      propostasNegociacao: [
        {
          id: "p1",
          unidadeId: 1,
          condominioId: 10,
          usuarioId: 1,
          valorProposto: "100",
          status: "Em análise",
          filaNegociacaoEm: "2026-11-20T10:00:00.000Z",
          filaNegociacaoPorId: 1,
          debitoIds: [],
        } as Cadastros["propostasNegociacao"][number],
      ],
    });
    assert.equal(situacaoOperacionalFila(cadastros, unidade, true), "Em negociação");
  });

  test("débito em situação operacional Em negociação → Em negociação", () => {
    const unidade = unidadeBase();
    const cadastros = cadastrosBase({
      unidades: [unidade],
      debitos: [
        {
          id: 1,
          unidadeId: 1,
          status: "Vencido",
          situacaoInadimplencia: "Ativa",
          situacaoOperacional: SITUACAO_OPERACIONAL_EM_NEGOCIACAO,
        } as Cadastros["debitos"][number],
      ],
    });
    assert.equal(situacaoOperacionalFila(cadastros, unidade, false), "Em negociação");
  });
});