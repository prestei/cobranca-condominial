import assert from "node:assert/strict";
import test from "node:test";
import type { PropostaNegociacao, Unidade } from "@/data/catalogo";
import { unidadeElegivelFilaAtendimento } from "@/lib/fila/unidade-fila-atendimento";

const unidadeBase = (partial?: Partial<Unidade>): Unidade =>
  ({
    id: 1,
    condominioId: 10,
    identificacao: "101",
    bloco: "A",
    tipo: "Apartamento",
    status: "Ativa",
    situacao: "Em cobrança",
    ...partial,
  }) as Unidade;

const propostaBase = (partial?: Partial<PropostaNegociacao>): PropostaNegociacao =>
  ({
    id: "prop-1",
    unidadeId: 1,
    condominioId: 10,
    status: "Aceita",
    acordoConfirmadoEm: "2026-01-15T10:00:00.000Z",
    criadoEm: "2026-01-10T10:00:00.000Z",
    filaNegociacaoEm: "",
    ...partial,
  }) as PropostaNegociacao;

test("unidade em cobrança sem acordo confirmado permanece na fila de atendimento", () => {
  assert.equal(
    unidadeElegivelFilaAtendimento(unidadeBase(), { propostasNegociacao: [] }),
    true,
  );
});

test("unidade com proposta aceita e acordo confirmado sai da fila de atendimento", () => {
  assert.equal(
    unidadeElegivelFilaAtendimento(unidadeBase({ situacao: "Em acordo" }), {
      propostasNegociacao: [propostaBase()],
    }),
    false,
  );
});

test("proposta em análise ou aceita sem confirmação não remove a unidade da fila", () => {
  assert.equal(
    unidadeElegivelFilaAtendimento(unidadeBase(), {
      propostasNegociacao: [
        propostaBase({ status: "Em análise", acordoConfirmadoEm: "" }),
        propostaBase({ status: "Aceita", acordoConfirmadoEm: "" }),
      ],
    }),
    true,
  );
});