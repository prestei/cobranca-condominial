import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

process.env.NODE_ENV ??= "test";
process.env.AUTH_SECRET ??= "test-auth-secret-min-32-characters!!";

import { resetCadastrosParaTestes } from "@/data/catalogo";
import {
  cancelarRetornoAgendado,
  concluirRetornoAgendado,
  criarAtendimento,
  reprogramarRetornoAgendado,
} from "@/lib/atendimentos/service";
import { getCadastros } from "@/data/catalogo";
import { listarHistoricoRetornosAtendimento, listarRetornosAgenda } from "@/lib/retornos/service";
import { retornoAgendaAtivo } from "@/lib/retornos/status";

const ATENDENTE_RAQUEL_ID = 2;

describe("T31 — agenda e operações de retorno", () => {
  beforeEach(() => {
    resetCadastrosParaTestes();
  });

  test("reprogramar preserva histórico e atualiza data", () => {
    const atendimento = criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      responsavelId: 2,
      canal: "Telefone",
      respondeu: "Não",
      assunto: "T31 reprogramar",
      descricao: "Teste",
      status: "Pendente",
      dataProximaAcao: "2032-01-10T09:00:00",
      proximaAcao: "Ligar novamente",
    });

    const reprogramado = reprogramarRetornoAgendado(ATENDENTE_RAQUEL_ID, atendimento.id, {
      dataProximaAcao: "2032-01-20T14:00:00",
      proximaAcao: "Confirmar pagamento",
    });
    assert.equal(reprogramado.dataProximaAcao.startsWith("2032-01-20"), true);
    assert.ok(retornoAgendaAtivo(reprogramado));

    const historico = listarHistoricoRetornosAtendimento(ATENDENTE_RAQUEL_ID, atendimento.id);
    assert.ok(historico.length >= 2);
  });

  test("cancelar retorno remove da lista pendente sem apagar registro", () => {
    const atendimento = criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      canal: "WhatsApp",
      respondeu: "Não",
      status: "Pendente",
      dataProximaAcao: "2032-02-01T11:00:00",
      proximaAcao: "Retorno WhatsApp",
    });

    cancelarRetornoAgendado(ATENDENTE_RAQUEL_ID, atendimento.id, "Morador pediu para remarcar depois");

    const gravado = getCadastros().atendimentos.find((item) => item.id === atendimento.id);
    assert.ok(gravado?.retornoCanceladoEm?.trim());
    assert.equal(retornoAgendaAtivo(gravado!), false);

    const pendentes = listarRetornosAgenda(ATENDENTE_RAQUEL_ID, { estado: "pendente" });
    assert.ok(!pendentes.itens.some((item) => item.atendimentoId === atendimento.id));
  });

  test("concluído não permanece como pendente", () => {
    const atendimento = criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      canal: "Telefone",
      respondeu: "Não",
      status: "Pendente",
      dataProximaAcao: "2032-03-05T16:00:00",
      proximaAcao: "Confirmar boleto",
    });
    concluirRetornoAgendado(ATENDENTE_RAQUEL_ID, atendimento.id);
    const pendentes = listarRetornosAgenda(ATENDENTE_RAQUEL_ID, { estado: "pendente" });
    assert.ok(!pendentes.itens.some((item) => item.atendimentoId === atendimento.id));
    const concluidos = listarRetornosAgenda(ATENDENTE_RAQUEL_ID, { estado: "concluido" });
    assert.ok(concluidos.itens.some((item) => item.atendimentoId === atendimento.id));
  });
});
