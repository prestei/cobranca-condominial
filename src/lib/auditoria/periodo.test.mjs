import assert from "node:assert/strict";
import test from "node:test";
import { registroDentroDoPeriodo } from "./periodo.ts";

test("registroDentroDoPeriodo respeita intervalo inclusivo", () => {
  const instante = "2026-10-15T12:00:00.000Z";
  assert.equal(registroDentroDoPeriodo(instante, "2026-10-15", "2026-10-15"), true);
  assert.equal(registroDentroDoPeriodo(instante, "2026-10-16", undefined), false);
  assert.equal(registroDentroDoPeriodo(instante, undefined, "2026-10-14"), false);
});
