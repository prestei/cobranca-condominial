import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PropostaNegociacao } from "@/data/catalogo";
import type { ResumoAcordo } from "@/lib/acordos/resumo";
import { negociacaoExigeIntervencaoAdvogado } from "@/lib/negociacoes/intervencao-advogado-juridico";

function proposta(parcial: Partial<PropostaNegociacao>): PropostaNegociacao {
  return {
    id: "p1",
    condominioId: 1,
    unidadeId: 1,
    usuarioId: 1,
    criadoEm: "2026-01-01T10:00:00.000Z",
    status: "Em análise",
    valorProposto: "100.00",
    observacoes: "",
    debitoIds: [1],
    acordoConfirmadoEm: "",
    acordoConfirmadoPorId: null,
    termosAprovados: "",
    advogadoResponsavelId: 2,
    valorDividaOriginal: "100.00",
    valorDividaAtualizada: "100.00",
    quantidadeParcelas: 6,
    valoresDefinidosPorId: 1,
    valoresAprovadosPorId: null,
    filaNegociacaoEm: "",
    filaNegociacaoPorId: null,
    assuncaoJuridicaEm: "",
    assuncaoJuridicaPorId: null,
    encaminhamentoJuridicoAssuncaoId: "",
    ...parcial,
  };
}

const resumoAtraso: ResumoAcordo = {
  propostaId: "p1",
  unidadeId: 1,
  valorAcordado: "100.00",
  valorPagoConfirmado: "0.00",
  valorPagoInformado: "0.00",
  saldoRestante: "100.00",
  parcelasTotal: 6,
  parcelasPagas: 0,
  parcelasPendentes: 5,
  parcelasVencidas: 1,
  parcelasCanceladas: 0,
  potencialDescumprimento: true,
  parcelas: [],
};

describe("negociacaoExigeIntervencaoAdvogado", () => {
  it("exige em proposta Em análise", () => {
    assert.equal(negociacaoExigeIntervencaoAdvogado(proposta({ status: "Em análise" })), true);
  });

  it("exige em acordo aceito com parcelas vencidas", () => {
    assert.equal(
      negociacaoExigeIntervencaoAdvogado(proposta({ status: "Aceita" }), resumoAtraso),
      true,
    );
  });

  it("não exige em acordo aceito em dia", () => {
    assert.equal(
      negociacaoExigeIntervencaoAdvogado(
        proposta({ status: "Aceita" }),
        { ...resumoAtraso, parcelasVencidas: 0, potencialDescumprimento: false },
      ),
      false,
    );
  });

  it("não exige após assunção jurídica", () => {
    assert.equal(
      negociacaoExigeIntervencaoAdvogado(
        proposta({ status: "Em análise", assuncaoJuridicaEm: "2026-02-01T10:00:00.000Z" }),
      ),
      false,
    );
  });
});