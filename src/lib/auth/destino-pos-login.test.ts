import assert from "node:assert/strict";
import { test } from "node:test";
import { destinoSeguroAposLogin } from "@/lib/auth/destino-pos-login";
import type { PermissoesCargo } from "@/lib/permissions/modulos";

const atendente: PermissoesCargo = {
  dashboard: { ler: true },
  atendimentos: { ler: true, criar: true, editar: true },
  debitos: { ler: true },
};

const soAtendimentos: PermissoesCargo = {
  atendimentos: { ler: true },
};

test("atendente com from=/cargos vai para o início", () => {
  assert.equal(destinoSeguroAposLogin("/cargos", atendente), "/");
});

test("atendente com from=/atendimentos mantém o destino", () => {
  assert.equal(destinoSeguroAposLogin("/atendimentos", atendente), "/atendimentos");
});

test("atendente sem from vai para o início", () => {
  assert.equal(destinoSeguroAposLogin(null, atendente), "/");
});

test("from externo ou protocol-relative é ignorado", () => {
  assert.equal(destinoSeguroAposLogin("//evil.example", atendente), "/");
  assert.equal(destinoSeguroAposLogin("https://evil.example", atendente), "/");
});

test("preserva query em destino permitido", () => {
  assert.equal(
    destinoSeguroAposLogin("/atendimentos?retorno=hoje", atendente),
    "/atendimentos?retorno=hoje",
  );
});

test("sem dashboard usa a primeira rota com ler", () => {
  assert.equal(destinoSeguroAposLogin("/cargos", soAtendimentos), "/atendimentos");
});
