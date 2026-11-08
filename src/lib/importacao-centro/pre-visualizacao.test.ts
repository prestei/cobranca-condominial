import assert from "node:assert/strict";
import test from "node:test";
import {
  contarPreVisualizacao,
  indicadorLinhaPreVisualizacao,
  linhaSeraGravada,
} from "@/lib/importacao-centro/pre-visualizacao";

test("indicadorLinhaPreVisualizacao prioriza erro de parse e do motor", () => {
  assert.equal(indicadorLinhaPreVisualizacao({ situacao: "erro" }), "erro");
  assert.equal(
    indicadorLinhaPreVisualizacao({
      situacao: "novo",
      validacao: { resultado: "erro" } as never,
    }),
    "erro",
  );
  assert.equal(
    indicadorLinhaPreVisualizacao({
      situacao: "duplicado",
      validacao: { resultado: "valido" } as never,
    }),
    "atencao",
  );
});

test("contarPreVisualizacao agrega válidos, atenção, erros e duplicidades", () => {
  const linhas = [
    { linha: 1, situacao: "novo" as const, validacao: { resultado: "valido" } as never },
    { linha: 2, situacao: "duplicado" as const, validacao: { resultado: "valido" } as never },
    { linha: 3, situacao: "erro" as const },
    {
      linha: 4,
      situacao: "novo" as const,
      validacao: { resultado: "atencao" } as never,
    },
  ];
  const contagens = contarPreVisualizacao(linhas);
  assert.equal(contagens.validos, 1);
  assert.equal(contagens.duplicidades, 1);
  assert.equal(contagens.erros, 1);
  assert.equal(contagens.atencao, 2);
});

test("linhaSeraGravada considera apenas novos e atualizações sem erro", () => {
  assert.equal(linhaSeraGravada({ linha: 1, situacao: "novo" }), true);
  assert.equal(linhaSeraGravada({ linha: 2, situacao: "duplicado" }), false);
  assert.equal(
    linhaSeraGravada({
      linha: 3,
      situacao: "novo",
      validacao: { resultado: "erro" } as never,
    }),
    false,
  );
});
