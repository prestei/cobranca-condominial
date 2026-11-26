import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { rotuloAcaoProximoPassoNegociacao, validarCombinacaoProximoPasso } from "@/lib/negociacoes/next-step-decision-labels";

describe("T26 — rótulos e validação do próximo passo", () => {
  test("rótulos das três ações", () => {
    assert.equal(rotuloAcaoProximoPassoNegociacao("continue_service"), "Continuar atendimento");
    assert.equal(rotuloAcaoProximoPassoNegociacao("forward_negotiation_queue"), "Encaminhar para negociação");
    assert.equal(rotuloAcaoProximoPassoNegociacao("forward_analysis"), "Encaminhar para análise");
  });

  test("continuar atendimento não aceita destino de análise", () => {
    const resultado = validarCombinacaoProximoPasso("continue_service", "juridico");
    assert.equal(resultado.ok, false);
  });

  test("encaminhar para análise exige destino", () => {
    const invalido = validarCombinacaoProximoPasso("forward_analysis");
    assert.equal(invalido.ok, false);
    const advogado = validarCombinacaoProximoPasso("forward_analysis", "lawyer_negotiation");
    assert.equal(advogado.ok, true);
    if (advogado.ok) {
      assert.equal(advogado.destinoAnalise, "lawyer_negotiation");
    }
  });
});