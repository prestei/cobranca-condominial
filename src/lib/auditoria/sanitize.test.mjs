import assert from "node:assert/strict";
import test from "node:test";
import {
  sanitizarCamposAlterados,
  sanitizarTextoAuditoria,
} from "./sanitize.ts";

test("sanitizarTextoAuditoria remove senha e hash bcrypt", () => {
  const raw = JSON.stringify({ nome: "Ana", senha: "$2b$12$abcdefghijklmnopqrstuv" });
  const out = JSON.parse(sanitizarTextoAuditoria(raw));
  assert.equal(out.nome, "Ana");
  assert.equal(out.senha, "[omitido]");
});

test("sanitizarCamposAlterados renomeia campo senha", () => {
  assert.equal(sanitizarCamposAlterados("nome, senha, email"), "nome, credencial_acesso, email");
});
