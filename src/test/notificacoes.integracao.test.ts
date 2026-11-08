/**
 * T34 — notificações internas (serviços + catálogo em memória).
 */
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

process.env.NODE_ENV ??= "test";
process.env.AUTH_SECRET ??= "test-auth-secret-min-32-characters!!";

import { getCadastros, resetCadastrosParaTestes } from "@/data/catalogo";
import { criarAtendimento } from "@/lib/atendimentos/service";
import { distribuirUnidades } from "@/lib/distribuicao/service";
import {
  contarNotificacoesNaoLidas,
  listarNotificacoes,
  marcarNotificacaoLida,
  NotificacaoServiceError,
  obterNotificacaoParaAbrir,
  atualizarPreferenciasNotificacao,
  processarLembretesRetornoHoje,
  reprocessarEventoRetornoAgendado,
  resetPreferenciasNotificacaoTestes,
  setSimularFalhaNotificacao,
} from "@/lib/notificacoes/service";
import { hojeEmFuso } from "@/lib/notificacoes/timezone";

const ADMIN_ID = 1;
const ATENDENTE_RAQUEL_ID = 2;
const ATENDENTE_TASSIA_ID = 3;

beforeEach(() => {
  resetCadastrosParaTestes();
  resetPreferenciasNotificacaoTestes();
});

describe("T34 — retorno agendado", () => {
  test("destinatário é o atendente da carteira vigente", () => {
    const atendimento = criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      responsavelId: 2,
      canal: "Telefone",
      respondeu: "Não",
      assunto: "T34 retorno",
      descricao: "Agendar",
      status: "Pendente",
      dataProximaAcao: "2030-06-15T10:00:00",
      proximaAcao: "Retornar ligação",
    });

    const notifs = getCadastros().notificacoesInternas.filter((item) => item.evento === "retorno_agendado");
    assert.equal(notifs.length, 1);
    assert.equal(notifs[0]?.destinatarioId, ATENDENTE_RAQUEL_ID);
    assert.equal(notifs[0]?.registroId, atendimento.id);

    const segunda = reprocessarEventoRetornoAgendado(atendimento.id);
    assert.equal(getCadastros().notificacoesInternas.filter((item) => item.evento === "retorno_agendado").length, 1);
    assert.equal(segunda?.id, notifs[0]?.id);
  });
});

describe("T34 — redistribuição", () => {
  test("notifica o novo atendente da carteira", () => {
    distribuirUnidades(ADMIN_ID, {
      unidadeIds: [2],
      codigoRe: "RE-10001",
      motivo: "T34 redistribuição",
    });

    const notifs = getCadastros().notificacoesInternas.filter((item) => item.evento === "cobranca_atribuida");
    assert.equal(notifs.length, 1);
    assert.equal(notifs[0]?.destinatarioId, ATENDENTE_TASSIA_ID);
    assert.equal(notifs[0]?.unidadeId, 2);
  });
});

describe("T34 — permissões e leitura", () => {
  test("marca como lida e atualiza contagem", () => {
    criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      responsavelId: 2,
      canal: "Telefone",
      respondeu: "Não",
      assunto: "T34 lida",
      descricao: "",
      status: "Pendente",
      dataProximaAcao: "2030-07-01T10:00:00",
      proximaAcao: "Retorno",
    });

    assert.ok(contarNotificacoesNaoLidas(ATENDENTE_RAQUEL_ID) >= 1);
    const [primeira] = listarNotificacoes(ATENDENTE_RAQUEL_ID, { limit: 1 });
    assert.ok(primeira);

    marcarNotificacaoLida(ATENDENTE_RAQUEL_ID, primeira.id);
    assert.equal(contarNotificacoesNaoLidas(ATENDENTE_RAQUEL_ID), 0);
  });

  test("registro fora do escopo ao abrir notificação de outro destinatário", () => {
    criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      responsavelId: 2,
      canal: "Telefone",
      respondeu: "Não",
      assunto: "T34 escopo",
      descricao: "",
      status: "Pendente",
      dataProximaAcao: "2030-07-02T10:00:00",
      proximaAcao: "Retorno",
    });
    const notif = getCadastros().notificacoesInternas.find((item) => item.destinatarioId === ATENDENTE_RAQUEL_ID);
    assert.ok(notif);

    assert.throws(
      () => obterNotificacaoParaAbrir(ATENDENTE_TASSIA_ID, notif.id),
      (error: unknown) => error instanceof NotificacaoServiceError && error.status === 404,
    );
  });
});

describe("T34 — falha do serviço", () => {
  test("falha ao gravar não impede criar atendimento", () => {
    setSimularFalhaNotificacao(true);
    const atendimento = criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      responsavelId: 2,
      canal: "Telefone",
      respondeu: "Não",
      assunto: "T34 falha",
      descricao: "",
      status: "Pendente",
      dataProximaAcao: "2030-08-01T10:00:00",
      proximaAcao: "Retorno",
    });
    assert.ok(atendimento.id);
    assert.equal(getCadastros().notificacoesInternas.length, 0);
    assert.ok(getCadastros().notificacaoFalhas.length >= 1);
  });
});

describe("T34 — lembrete e fuso", () => {
  test("lembrete idempotente no dia (America/Sao_Paulo)", () => {
    const hoje = hojeEmFuso();
    atualizarPreferenciasNotificacao(ATENDENTE_RAQUEL_ID, { horarioLembrete: "00:00" });
    criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      responsavelId: 2,
      canal: "Telefone",
      respondeu: "Não",
      assunto: "T34 hoje",
      descricao: "",
      status: "Pendente",
      dataProximaAcao: `${hoje}T14:00:00`,
      proximaAcao: "Retorno hoje",
    });

    processarLembretesRetornoHoje(`${hoje}T12:00:00.000-03:00`);
    const lembretes = getCadastros().notificacoesInternas.filter((item) => item.evento === "retorno_lembrete_hoje");
    assert.ok(lembretes.length >= 1);
    processarLembretesRetornoHoje(`${hoje}T18:00:00.000-03:00`);
    assert.equal(
      getCadastros().notificacoesInternas.filter((item) => item.evento === "retorno_lembrete_hoje").length,
      lembretes.length,
    );
  });
});
