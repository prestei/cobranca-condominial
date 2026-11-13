import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyDelinquencyTrackingStatus,
  computeDelinquencyTracking,
  DEFAULT_DELINQUENCY_TRACKING_DAYS,
  delinquencyTrackingDaysCaption,
  parseDelinquencyTrackingDaysInput,
  resolveDelinquencyTrackingDays,
} from "./delinquency-tracking";

test("resolveDelinquencyTrackingDays — padrão 60 sem configuração", () => {
  assert.equal(resolveDelinquencyTrackingDays({ delinquencyTrackingDays: null }), DEFAULT_DELINQUENCY_TRACKING_DAYS);
  assert.equal(resolveDelinquencyTrackingDays(undefined), DEFAULT_DELINQUENCY_TRACKING_DAYS);
});

test("resolveDelinquencyTrackingDays — prazos 30, 60 e 90 por condomínio", () => {
  assert.equal(resolveDelinquencyTrackingDays({ delinquencyTrackingDays: 30 }), 30);
  assert.equal(resolveDelinquencyTrackingDays({ delinquencyTrackingDays: 60 }), 60);
  assert.equal(resolveDelinquencyTrackingDays({ delinquencyTrackingDays: 90 }), 90);
});

test("classificar prazo 90 — dias 1, 89, 90 e após", () => {
  assert.equal(classifyDelinquencyTrackingStatus(1, 90), "within_term");
  assert.equal(classifyDelinquencyTrackingStatus(89, 90), "near_term_limit");
  assert.equal(classifyDelinquencyTrackingStatus(90, 90), "term_reached");
  assert.equal(classifyDelinquencyTrackingStatus(91, 90), "term_exceeded");
});

test("computeDelinquencyTracking — dias transcorridos e restantes (prazo 90)", () => {
  const dia1 = computeDelinquencyTracking("2026-01-01", "2026-01-01", 90);
  assert.equal(dia1.elapsedDays, 0);
  assert.equal(dia1.remainingDays, 90);

  const dia89 = computeDelinquencyTracking("2025-11-14", "2026-02-11", 90);
  assert.equal(dia89.elapsedDays, 89);
  assert.equal(dia89.remainingDays, 1);
  assert.equal(dia89.status, "near_term_limit");

  const dia90 = computeDelinquencyTracking("2025-11-13", "2026-02-11", 90);
  assert.equal(dia90.elapsedDays, 90);
  assert.equal(dia90.remainingDays, 0);
  assert.equal(dia90.status, "term_reached");

  const apos = computeDelinquencyTracking("2025-11-12", "2026-02-11", 90);
  assert.equal(apos.elapsedDays, 91);
  assert.equal(apos.remainingDays, 0);
  assert.equal(apos.status, "term_exceeded");
});

test("parseDelinquencyTrackingDaysInput — inteiro positivo ou vazio", () => {
  assert.deepEqual(parseDelinquencyTrackingDaysInput(""), { ok: true, value: null });
  assert.deepEqual(parseDelinquencyTrackingDaysInput("90"), { ok: true, value: 90 });
  assert.equal(parseDelinquencyTrackingDaysInput("0").ok, false);
  assert.equal(parseDelinquencyTrackingDaysInput("1.5").ok, false);
});

test("delinquencyTrackingDaysCaption — padrão e personalizado", () => {
  assert.equal(delinquencyTrackingDaysCaption({ delinquencyTrackingDays: null }), "Prazo inadimplência: 60 dias (padrão)");
  assert.equal(delinquencyTrackingDaysCaption({ delinquencyTrackingDays: 90 }), "Prazo inadimplência: 90 dias");
});
