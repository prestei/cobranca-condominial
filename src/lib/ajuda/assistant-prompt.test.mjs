import assert from "node:assert/strict";
import test from "node:test";

import { montarMensagensAssistente } from "./assistant-prompt.ts";

test("montarMensagensAssistente inclui matriz de permissões e pergunta", () => {
  const conhecimento = {
    modulo: "atendimentos",
    matrizPermissoes: "Atendimentos: Ver, Criar",
    docModulo: null,
    guiaAtual: null,
    indiceGuias: "- Atendimentos",
  };
  const msgs = montarMensagensAssistente({
    user: { userId: 1, email: "a@b.c", nome: "Ana", cargoId: 2 },
    perfil: "atendente",
    pathname: "/atendimentos",
    contextoTela: "Cabeçalho: Fila",
    pergunta: "Como filtro retornos?",
    historico: [],
    conhecimento,
  });
  assert.equal(msgs[0].role, "system");
  assert.match(msgs[0].content, /Atendimentos: Ver, Criar/);
  assert.match(msgs[0].content, /NÃO explique telas/);
  assert.equal(msgs.at(-1).content, "Como filtro retornos?");
});
