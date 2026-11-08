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
  processarAlertasRetornoCarteira,
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

  test("notifica o atendente anterior na transferência", () => {
    distribuirUnidades(ADMIN_ID, {
      unidadeIds: [2],
      codigoRe: "RE-10001",
      motivo: "T34 transferência",
    });

    const transferidas = getCadastros().notificacoesInternas.filter((item) => item.evento === "carteira_transferida");
    assert.equal(transferidas.length, 1);
    assert.equal(transferidas[0]?.destinatarioId, ATENDENTE_RAQUEL_ID);
  });
});

describe("T34 — atendimento atribuído", () => {
  test("admin registra atendimento na carteira de outro colaborador", () => {
    criarAtendimento(ADMIN_ID, {
      condominioId: 1,
      unidadeId: 2,
      responsavelId: 2,
      canal: "Telefone",
      respondeu: "Não",
      assunto: "T34 atribuído",
      descricao: "Contato",
      status: "Pendente",
      dataProximaAcao: "",
      proximaAcao: "",
    });

    const atribuido = getCadastros().notificacoesInternas.filter((item) => item.evento === "atendimento_atribuido");
    assert.equal(atribuido.length, 1);
    assert.equal(atribuido[0]?.destinatarioId, ATENDENTE_RAQUEL_ID);
  });
});

describe("T34 — alertas de retorno", () => {
  test("retorno na semana gera alerta de proximidade (idempotente por dia)", () => {
    const hoje = hojeEmFuso();
    const alvo = new Date(`${hoje}T12:00:00`);
    alvo.setDate(alvo.getDate() + 3);
    const dataRetorno = alvo.toISOString().slice(0, 10);

    criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      responsavelId: 2,
      canal: "Telefone",
      respondeu: "Não",
      assunto: "T34 próximo",
      descricao: "",
      status: "Pendente",
      dataProximaAcao: `${dataRetorno}T10:00:00`,
      proximaAcao: "Retorno",
    });

    processarAlertasRetornoCarteira();
    const proximos = getCadastros().notificacoesInternas.filter((item) => item.evento === "retorno_proximo");
    assert.ok(proximos.length >= 1);
    processarAlertasRetornoCarteira();
    assert.equal(
      getCadastros().notificacoesInternas.filter((item) => item.evento === "retorno_proximo").length,
      proximos.length,
    );
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

    const antesMarcar = contarNotificacoesNaoLidas(ATENDENTE_RAQUEL_ID);
    marcarNotificacaoLida(ATENDENTE_RAQUEL_ID, primeira.id);
    const relida = getCadastros().notificacoesInternas.find((item) => item.id === primeira.id);
    assert.ok(relida?.lidaEm);
    assert.ok(contarNotificacoesNaoLidas(ATENDENTE_RAQUEL_ID) < antesMarcar);
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
