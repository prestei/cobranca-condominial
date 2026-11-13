import assert from "node:assert/strict";
import test from "node:test";
import { situacaoDestinoAposDebitoEmAberto } from "@/lib/debitos/promover-unidade-cobranca";

test("promove Sem cobrança para Em cobrança ao gravar débito em aberto", () => {
  assert.equal(situacaoDestinoAposDebitoEmAberto({ situacao: "Sem cobrança" }), "Em cobrança");
});

test("promove Quitada para Em cobrança ao reabrir inadimplência manual", () => {
  assert.equal(situacaoDestinoAposDebitoEmAberto({ situacao: "Quitada" }), "Em cobrança");
});

test("não altera unidade prescrita", () => {
  assert.equal(situacaoDestinoAposDebitoEmAberto({ situacao: "Unidade prescrita" }), null);
  assert.equal(situacaoDestinoAposDebitoEmAberto({ situacao: "PRESCRITA" }), null);
});

test("não altera unidade já na fila operacional", () => {
  assert.equal(situacaoDestinoAposDebitoEmAberto({ situacao: "Em cobrança" }), null);
  assert.equal(situacaoDestinoAposDebitoEmAberto({ situacao: "Em acordo" }), null);
  assert.equal(situacaoDestinoAposDebitoEmAberto({ situacao: "Notificada" }), null);
});
