import assert from "node:assert/strict";
import test from "node:test";

import { formatarLinhaIndicador } from "./capture-screen-context.ts";

test("formatarLinhaIndicador junta rótulo, valor e detalhe opcional", () => {
  assert.equal(
    formatarLinhaIndicador({ valor: "R$ 12,00", rotulo: "Valor atualizado" }),
    "Valor atualizado: R$ 12,00",
  );
  assert.equal(
    formatarLinhaIndicador({
      valor: "42",
      rotulo: "Unidades devedoras",
      detalhe: "12% da carteira",
    }),
    "Unidades devedoras: 42 (12% da carteira)",
  );
});
