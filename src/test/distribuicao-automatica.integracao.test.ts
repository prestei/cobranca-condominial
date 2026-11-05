import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

process.env.NODE_ENV ??= "test";
process.env.AUTH_SECRET ??= "test-auth-secret-min-32-characters!!";

import { agoraIso, getCadastros, resetCadastrosParaTestes, setAtribuicoesCobranca } from "@/data/catalogo";
import {
  atualizarConfigDistribuicaoAutomatica,
  executarDistribuicaoAutomatica,
} from "@/lib/distribuicao/service";

const ADMIN_ID = 1;
const RAQUEL_ID = 2;
const TASSIA_ID = 3;

function encerrarAtribuicaoVigente(unidadeId: number) {
  const agora = agoraIso();
  setAtribuicoesCobranca(
    getCadastros().atribuicoesCobranca.map((item) =>
      item.unidadeId === unidadeId && !item.encerradoEm ? { ...item, encerradoEm: agora } : item,
    ),
  );
}

function atendenteIdDaUnidade(unidadeId: number) {
  const vigente = getCadastros().atribuicoesCobranca.find(
    (item) => item.unidadeId === unidadeId && !item.encerradoEm,
  );
  return vigente?.atendenteId ?? null;
}

beforeEach(() => {
  resetCadastrosParaTestes();
  atualizarConfigDistribuicaoAutomatica(ADMIN_ID, { ativada: true, estrategia: "carga" });
});

describe("distribuição automática — estratégias", () => {
  test("carga equilibrada prioriza RE com menos unidades", () => {
    encerrarAtribuicaoVigente(3);
    atualizarConfigDistribuicaoAutomatica(ADMIN_ID, { estrategia: "carga" });

    const resultado = executarDistribuicaoAutomatica(ADMIN_ID);
    assert.equal(resultado.atribuidas, 1);
    assert.equal(atendenteIdDaUnidade(3), TASSIA_ID);
  });

  test("por condomínio mantém RE que já atende o condomínio", () => {
    encerrarAtribuicaoVigente(2);
    atualizarConfigDistribuicaoAutomatica(ADMIN_ID, { estrategia: "condominio" });

    const resultado = executarDistribuicaoAutomatica(ADMIN_ID);
    assert.equal(resultado.atribuidas, 1);
    assert.equal(atendenteIdDaUnidade(2), RAQUEL_ID);
  });

  test("rodízio alterna REs entre unidades pendentes", () => {
    encerrarAtribuicaoVigente(2);
    encerrarAtribuicaoVigente(3);
    atualizarConfigDistribuicaoAutomatica(ADMIN_ID, { estrategia: "rodizio" });

    const resultado = executarDistribuicaoAutomatica(ADMIN_ID);
    assert.equal(resultado.atribuidas, 2);
    const re102 = atendenteIdDaUnidade(2);
    const re103 = atendenteIdDaUnidade(3);
    assert.notEqual(re102, re103);
    assert.ok(re102 === RAQUEL_ID || re102 === TASSIA_ID);
    assert.ok(re103 === RAQUEL_ID || re103 === TASSIA_ID);
  });

  test("por volume equilibra valor em aberto entre carteiras", () => {
    encerrarAtribuicaoVigente(2);
    atualizarConfigDistribuicaoAutomatica(ADMIN_ID, { estrategia: "volume" });

    const resultado = executarDistribuicaoAutomatica(ADMIN_ID);
    assert.equal(resultado.atribuidas, 1);
    assert.equal(atendenteIdDaUnidade(2), RAQUEL_ID);
  });
});
