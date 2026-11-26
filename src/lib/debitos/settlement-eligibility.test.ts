import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { debitoComObrigacoesCumpridas } from "@/lib/debitos/settlement-eligibility";
import { situacaoCobrancaDestinoAposReavaliacao } from "@/lib/debitos/unit-situation-reavaluation";
import { SITUACAO_OPERACIONAL_EM_ABERTO, SITUACAO_OPERACIONAL_QUITADA, inferirSituacaoOperacionalDebito } from "@/lib/debitos/operational-situation";

describe("T28 — quitação automática", () => {
  test("débito sem negociação só quita com pagamento confirmado persistido", () => {
    assert.equal(
      debitoComObrigacoesCumpridas(
        { status: "Pago", dataPagamento: "2026-11-01", valorPago: "150.00" },
        null,
      ),
      true,
    );
    assert.equal(
      debitoComObrigacoesCumpridas(
        { status: "Pago", dataPagamento: "2026-11-01", valorPago: "" },
        null,
      ),
      false,
    );
    assert.equal(
      debitoComObrigacoesCumpridas({ status: "Vencido", dataPagamento: "", valorPago: "" }, null),
      false,
    );
  });

  test("acordo formalizado sem pagamento confirmado não quita", () => {
    assert.equal(
      debitoComObrigacoesCumpridas(
        { status: "Vencido", dataPagamento: "", valorPago: "" },
        {
          proposalId: "p1",
          formalizadoEm: "2026-10-01T12:00:00.000Z",
          valorNegociadoAlocado: "500.00",
          valorPagoConfirmado: "0.00",
          saldoRestante: "500.00",
        },
      ),
      false,
    );
  });

  test("saldo negociado zerado com pagamento confirmado quita", () => {
    assert.equal(
      debitoComObrigacoesCumpridas(
        { status: "Vencido", dataPagamento: "", valorPago: "" },
        {
          proposalId: "p1",
          formalizadoEm: "2026-10-01T12:00:00.000Z",
          valorNegociadoAlocado: "500.00",
          valorPagoConfirmado: "500.00",
          saldoRestante: "0.00",
        },
      ),
      true,
    );
    const sit = inferirSituacaoOperacionalDebito(
      { status: "Vencido", situacaoInadimplencia: "Ativa", dataVencimento: "2026-01-01", dataPagamento: "", valorPago: "" },
      true,
      {
        proposalId: "p1",
        formalizadoEm: "2026-10-01T12:00:00.000Z",
        valorNegociadoAlocado: "500.00",
        valorPagoConfirmado: "500.00",
        saldoRestante: "0.00",
      },
    );
    assert.equal(sit, SITUACAO_OPERACIONAL_QUITADA);
  });

  test("unidade com uma dívida quitada e outra aberta permanece inadimplente", () => {
    const destino = situacaoCobrancaDestinoAposReavaliacao(
      { situacao: "Em cobrança" },
      [
        {
          id: 1,
          status: "Pago",
          dataVencimento: "2026-01-10",
          dataPagamento: "2026-11-01",
          valorPago: "100",
          situacaoOperacional: SITUACAO_OPERACIONAL_QUITADA,
        } as never,
        {
          id: 2,
          status: "Vencido",
          dataVencimento: "2026-02-10",
          dataPagamento: "",
          valorPago: "",
          situacaoOperacional: SITUACAO_OPERACIONAL_EM_ABERTO,
        } as never,
      ],
      "2026-11-16",
    );
    assert.equal(destino, null);
  });

  test("unidade sem débitos vencidos ativos volta à Sem cobrança", () => {
    const destino = situacaoCobrancaDestinoAposReavaliacao(
      { situacao: "Em cobrança" },
      [
        {
          id: 1,
          status: "Pago",
          dataVencimento: "2026-01-10",
          dataPagamento: "2026-11-01",
          valorPago: "100",
          situacaoOperacional: SITUACAO_OPERACIONAL_QUITADA,
        } as never,
      ],
      "2026-11-16",
    );
    assert.equal(destino, "Sem cobrança");
  });
});