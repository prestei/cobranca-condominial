import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  FUSO_OPERACIONAL,
  agoraIsoOperacional,
  formatarDataOperacional,
  hojeIsoOperacional,
  instantParaIsoDataHoraOperacional,
  isoOperacionalParaInstant,
} from "@/lib/datetime/fuso-operacional";

describe("fuso operacional (Bahia)", () => {
  test("formata instante UTC para exibição local", () => {
    const utc = "2026-11-26T02:25:00.000Z";
    assert.equal(formatarDataOperacional(utc), "25/11/2026 23:25");
  });

  test("mantém ISO já sem fuso como operacional", () => {
    assert.equal(formatarDataOperacional("2026-11-25T23:25"), "25/11/2026 23:25");
  });

  test("data sem hora", () => {
    assert.equal(formatarDataOperacional("2026-11-25"), "25/11/2026");
  });

  test("mapper: instante → ISO operacional", () => {
    const d = new Date("2026-11-26T02:25:00.000Z");
    assert.equal(instantParaIsoDataHoraOperacional(d), "2026-11-25T23:25");
  });

  test("parse operacional com offset Bahia", () => {
    const d = isoOperacionalParaInstant("2026-11-25T23:30");
    assert.equal(d.toISOString(), "2026-11-26T02:30:00.000Z");
  });

  test("hoje/agora usam fuso Bahia", () => {
    assert.equal(FUSO_OPERACIONAL, "America/Bahia");
    assert.match(hojeIsoOperacional(), /^\d{4}-\d{2}-\d{2}$/);
    assert.match(agoraIsoOperacional(), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });
});