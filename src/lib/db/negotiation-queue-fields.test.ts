import assert from "node:assert/strict";
import test from "node:test";
import { negotiationQueueFields } from "@/lib/db/negotiation-queue-fields";

test("omite fila vazia no create", () => {
  assert.deepEqual(negotiationQueueFields({ filaNegociacaoEm: "", filaNegociacaoPorId: null }), {});
});

test("inclui fila preenchida", () => {
  const fields = negotiationQueueFields({
    filaNegociacaoEm: "2026-11-19T12:00:00.000Z",
    filaNegociacaoPorId: 6,
  });
  assert.ok(fields.negotiationQueueAt instanceof Date);
  assert.equal(fields.negotiationQueueByUserId, 6);
});

test("update pode limpar fila", () => {
  assert.deepEqual(
    negotiationQueueFields({ filaNegociacaoEm: "", filaNegociacaoPorId: null }, { clearWhenEmpty: true }),
    { negotiationQueueAt: null, negotiationQueueByUserId: null },
  );
});