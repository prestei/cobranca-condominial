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

const cadastroVazio = { propostasNegociacao: [] as PropostaNegociacao[], debitos: [] };

test("unidade em cobrança sem negociação permanece na fila de atendimento", () => {
  assert.equal(unidadeElegivelFilaAtendimento(unidadeBase(), cadastroVazio), true);
});

test("unidade com proposta aceita ou em acordo sai da fila de atendimento", () => {
  assert.equal(
    unidadeElegivelFilaAtendimento(unidadeBase({ situacao: "Em acordo" }), {
      propostasNegociacao: [propostaBase()],
      debitos: [],
    }),
    false,
  );
  assert.equal(
    unidadeElegivelFilaAtendimento(unidadeBase(), {
      propostasNegociacao: [propostaBase({ acordoConfirmadoEm: "" })],
      debitos: [],
    }),
    false,
  );
});

test("proposta em análise sem encaminhamento à negociação permanece na fila", () => {
  assert.equal(
    unidadeElegivelFilaAtendimento(unidadeBase(), {
      propostasNegociacao: [
        propostaBase({ status: "Em análise", acordoConfirmadoEm: "", filaNegociacaoEm: "" }),
      ],
      debitos: [],
    }),
    true,
  );
});