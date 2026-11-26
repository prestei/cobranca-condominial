import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  acaoRapidaKanban,
  colunaKanbanDoStatus,
  encaminhamentoNoKanban,
  indicePassoKanban,
  rotuloBadgeKanban,
} from "@/lib/juridico/kanban-colunas";

describe("kanban-colunas jurídico", () => {
  it("mapeia status para colunas", () => {
    assert.equal(colunaKanbanDoStatus("Encaminhado"), "para_analise");
    assert.equal(colunaKanbanDoStatus("Em análise"), "em_andamento");
    assert.equal(colunaKanbanDoStatus("Aguardando decisão"), "acao_definida");
    assert.equal(colunaKanbanDoStatus("Pronto para ajuizamento"), "em_processo");
    assert.equal(colunaKanbanDoStatus("Arquivado"), null);
  });

  it("identifica casos visíveis no board", () => {
    assert.equal(encaminhamentoNoKanban("Encaminhado"), true);
    assert.equal(encaminhamentoNoKanban("Arquivado"), false);
  });

  it("define passo do fluxo", () => {
    assert.equal(indicePassoKanban("Encaminhado"), 0);
    assert.equal(indicePassoKanban("Aguardando decisão"), 1);
    assert.equal(indicePassoKanban("Pronto para ajuizamento"), 2);
    assert.equal(indicePassoKanban("Arquivado"), 3);
  });

  it("rótulo do badge no card", () => {
    assert.equal(rotuloBadgeKanban("Encaminhado"), "Novo");
    assert.equal(rotuloBadgeKanban("Aguardando decisão"), "Ação definida");
    assert.equal(rotuloBadgeKanban("Arquivado"), "Finalizado");
  });

  it("ação rápida no card", () => {
    assert.deepEqual(acaoRapidaKanban("Encaminhado"), {
      rotulo: "Confirmar análise",
      proximoStatus: "Em análise",
    });
    assert.deepEqual(acaoRapidaKanban("Pronto para ajuizamento"), {
      rotulo: "Finalizar caso",
      proximoStatus: "Arquivado",
    });
    assert.equal(acaoRapidaKanban("Arquivado"), null);
  });
});