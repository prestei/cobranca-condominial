import assert from "node:assert/strict";
import test from "node:test";
import { criarAtendimento, concluirRetornoAgendado } from "@/lib/atendimentos/service";
import {
  montarPainelMinhaProdutividade,
  listarRegistrosIndicador,
  MinhaProdutividadeError,
} from "@/lib/produtividade-individual/service";

const ADMIN_ID = 1;
const ATENDENTE_RAQUEL_ID = 2;

test("T29 — administradora não acessa produtividade individual", () => {
  assert.throws(
    () =>
      montarPainelMinhaProdutividade(ADMIN_ID, "2026-01-01", "2026-01-31"),
    (error: unknown) => error instanceof MinhaProdutividadeError && error.status === 403,
  );
});

test("T29 — indicadores refletem autoria do atendente no período", () => {
  const atendimento = criarAtendimento(ATENDENTE_RAQUEL_ID, {
    condominioId: 1,
    unidadeId: 2,
    responsavelId: 2,
    canal: "Telefone",
    respondeu: "Não",
    status: "Pendente",
    assunto: "T29 produtividade",
    dataProximaAcao: "2026-02-01",
    proximaAcao: "Retornar ligação",
  });
  const dia = atendimento.dataHora.slice(0, 10);
  const painel = montarPainelMinhaProdutividade(ATENDENTE_RAQUEL_ID, dia, dia);

  assert.ok(painel.indicadores.atendimentos_realizados >= 1);
  assert.equal(
    painel.graficos.atendimentosRealizados.find((item) => item.dia === dia)?.valor,
    painel.indicadores.atendimentos_realizados,
  );

  concluirRetornoAgendado(ATENDENTE_RAQUEL_ID, atendimento.id);
  const painelDepois = montarPainelMinhaProdutividade(ATENDENTE_RAQUEL_ID, dia, dia);
  assert.ok(painelDepois.indicadores.retornos_realizados >= 1);

  const registros = listarRegistrosIndicador(ATENDENTE_RAQUEL_ID, "retornos_realizados", dia, dia);
  assert.ok(registros.some((item) => item.atendimentoId === atendimento.id));
});
