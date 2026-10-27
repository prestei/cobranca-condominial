import assert from "node:assert/strict";
import test from "node:test";

/**
 * Espelho da lógica de deduplicação em indicadores.ts (testável sem transpilar TS no CI).
 * Manter alinhado a chaveUnicaIndicador / somarValorAtualizadoSemDuplicata.
 */
function chaveUnicaIndicador(item) {
  const ext = (item.identificadorExterno ?? "").trim();
  if (ext) return `ext:${ext.toLocaleLowerCase("pt-BR")}`;
  return `id:${item.id}`;
}

function somarValorAtualizadoSemDuplicata(itens) {
  const vistos = new Set();
  let total = 0;
  for (const item of itens) {
    const chave = chaveUnicaIndicador(item);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    total += Number(item.valorAtualizado) || 0;
  }
  return total;
}

test("somarValorAtualizadoSemDuplicata não soma duas vezes o mesmo identificador externo", () => {
  const itens = [
    { id: 1, identificadorExterno: "ABC-1", valorAtualizado: "100.00" },
    { id: 2, identificadorExterno: "abc-1", valorAtualizado: "50.00" },
    { id: 3, identificadorExterno: "", valorAtualizado: "20.00" },
  ];
  assert.equal(somarValorAtualizadoSemDuplicata(itens), 120);
});

test("somarValorAtualizadoSemDuplicata soma ids distintos sem identificador externo", () => {
  const itens = [
    { id: 10, identificadorExterno: "", valorAtualizado: "30.00" },
    { id: 11, identificadorExterno: "", valorAtualizado: "70.00" },
  ];
  assert.equal(somarValorAtualizadoSemDuplicata(itens), 100);
});
