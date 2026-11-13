import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { chavesCodigoLogin, entradaLoginCoincideCodigo, normalizarCodigoUsuario } from "@/lib/auth/codigo";

describe("normalizarCodigoUsuario", () => {
  test("código RE sem hífen", () => {
    assert.equal(normalizarCodigoUsuario("RE10002"), "RE-10002");
    assert.equal(normalizarCodigoUsuario("re10002"), "RE-10002");
  });

  test("código RE com espaços", () => {
    assert.equal(normalizarCodigoUsuario("RE - 10002"), "RE-10002");
    assert.equal(normalizarCodigoUsuario("RE  10002"), "RE-10002");
  });

  test("código RE já canônico", () => {
    assert.equal(normalizarCodigoUsuario("RE-10002"), "RE-10002");
  });

  test("login legado por nome/código não muda", () => {
    assert.equal(normalizarCodigoUsuario("MILENA"), "MILENA");
    assert.equal(normalizarCodigoUsuario(" 12345 "), "12345");
  });
});

describe("chavesCodigoLogin", () => {
  test("só número vira RE canônico entre as chaves", () => {
    assert.deepEqual(chavesCodigoLogin("10002"), ["10002", "RE-10002"]);
  });

  test("código numérico legado permanece na busca", () => {
    assert.ok(chavesCodigoLogin("12345").includes("12345"));
    assert.ok(chavesCodigoLogin("12345").includes("RE-12345"));
  });
});

describe("entradaLoginCoincideCodigo", () => {
  test("número sem RE encontra codigo_re", () => {
    assert.equal(entradaLoginCoincideCodigo("10002", "RE-10002", "RE-10002"), true);
    assert.equal(entradaLoginCoincideCodigo("10002", "ATD003", "RE-10002"), true);
  });

  test("código legado não confunde com RE", () => {
    assert.equal(entradaLoginCoincideCodigo("USUARIOTST", "USUARIOTST", "RE-10005"), true);
    assert.equal(entradaLoginCoincideCodigo("USUARIOTST", "OUTRO", "RE-10005"), false);
  });
});
