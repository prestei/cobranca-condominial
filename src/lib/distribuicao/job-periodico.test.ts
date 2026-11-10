import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

process.env.NODE_ENV ??= "test";

import { agoraIso } from "@/data/catalogo";
import { getCadastros, resetCadastrosParaTestes, setAtribuicoesCobranca } from "@/data/catalogo-store";
import { atualizarConfigDistribuicaoAutomatica } from "@/lib/distribuicao/service";
import {
  executarCicloDistribuicaoAutomatica,
  resetAgendamentoDistribuicaoAutomaticaParaTestes,
} from "@/lib/distribuicao/job-periodico";

const ADMIN_ID = 1;

function encerrarAtribuicaoVigente(unidadeId: number) {
  const agora = agoraIso();
  setAtribuicoesCobranca(
    getCadastros().atribuicoesCobranca.map((item) =>
      item.unidadeId === unidadeId && !item.encerradoEm ? { ...item, encerradoEm: agora } : item,
    ),
  );
}

beforeEach(async () => {
  resetCadastrosParaTestes();
  resetAgendamentoDistribuicaoAutomaticaParaTestes();
  await atualizarConfigDistribuicaoAutomatica(ADMIN_ID, { ativada: true, estrategia: "carga" });
});

describe("job periódico de distribuição automática", () => {
  test("com opção ativa atribui pendentes sem RE", async () => {
    encerrarAtribuicaoVigente(3);
    const ciclo = await executarCicloDistribuicaoAutomatica();
    assert.equal(ciclo.executou, true);
    assert.ok((ciclo.resultado?.atribuidas ?? 0) >= 1);
    const vigente = getCadastros().atribuicoesCobranca.find(
      (item) => item.unidadeId === 3 && !item.encerradoEm,
    );
    assert.ok(vigente);
  });

  test("com opção desativada não executa", async () => {
    encerrarAtribuicaoVigente(3);
    await atualizarConfigDistribuicaoAutomatica(ADMIN_ID, { ativada: false });
    const ciclo = await executarCicloDistribuicaoAutomatica();
    assert.equal(ciclo.executou, false);
    assert.equal(ciclo.motivo, "desativada");
    const vigente = getCadastros().atribuicoesCobranca.find(
      (item) => item.unidadeId === 3 && !item.encerradoEm,
    );
    assert.equal(vigente, undefined);
  });
});
