/**
 * T21 — fluxos integrados (serviços + catálogo em memória, sem HTTP nem serviços externos).
 */
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

process.env.NODE_ENV ??= "test";
process.env.AUTH_SECRET ??= "test-auth-secret-min-32-characters!!";

import { getCadastros, resetCadastrosParaTestes } from "@/data/catalogo";
import { findUsuarioPorCredenciais } from "@/lib/auth/credentials";
import { SENHA_DEMONSTRACAO } from "@/lib/auth/constants";
import { readSessionToken, signSessionToken } from "@/lib/auth/jwt";
import { criarAtendimento, concluirRetornoAgendado } from "@/lib/atendimentos/service";
import { criarCondominio } from "@/lib/condominios/service";
import { confirmarQuitacaoUnidade, atualizarDebito, obterDebito } from "@/lib/debitos/service";
import { distribuirUnidades } from "@/lib/distribuicao/service";
import { listarFilaCobranca } from "@/lib/fila/service";
import { obterHistoricoUnidade } from "@/lib/historico-unidade/service";
import {
  confirmarImportacaoDebitos,
  previewImportacaoDebitos,
} from "@/lib/importacoes/debitos-service";
import { montarPainelProdutividadePorRe } from "@/lib/relatorios/produtividade";
import { RelatorioServiceError, montarExportRelatorio, filtrosPadrao } from "@/lib/relatorios/service";
import { criarUnidade, obterUnidadeDetalhe, UnidadeServiceError } from "@/lib/unidades/service";
import { criarUsuario } from "@/lib/usuarios/service";
import { listarCondominios } from "@/lib/condominios/service";
import { sincronizarCondominiosAdvogado } from "@/lib/usuarios/advogado-condominios";

const ADMIN_ID = 1;
const ATENDENTE_RAQUEL_ID = 2;
const ATENDENTE_TASSIA_ID = 3;
const ADVOGADO_ID = 5;

beforeEach(() => {
  resetCadastrosParaTestes();
});

describe("T21 — autenticação por perfil", () => {
  const perfis = [
    { codigo: "MILENA", cargoId: 1 },
    { codigo: "RAQUEL", cargoId: 2 },
    { codigo: "ADRYELLE", cargoId: 3 },
  ] as const;

  for (const perfil of perfis) {
    test(`login válido: ${perfil.codigo}`, async () => {
      const usuario = await findUsuarioPorCredenciais(perfil.codigo, SENHA_DEMONSTRACAO);
      assert.ok(usuario);
      assert.equal(usuario.cargoId, perfil.cargoId);
      const token = await signSessionToken({
        userId: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        cargoId: usuario.cargoId,
      });
      const sessao = await readSessionToken(token);
      assert.deepEqual(sessao, {
        userId: usuario.id,
        email: usuario.email,
        nome: usuario.nome,
        cargoId: usuario.cargoId,
      });
    });
  }

  test("logout lógico: token inválido não restaura sessão", async () => {
    const sessao = await readSessionToken("token-invalido");
    assert.equal(sessao, null);
  });

  test("credenciais incorretas não autenticam", async () => {
    const usuario = await findUsuarioPorCredenciais("MILENA", "senha-errada");
    assert.equal(usuario, null);
  });
});

describe("T21 — cadastro administradora + RE único", () => {
  test("cria condomínio, unidade e atendente com RE sequencial", async () => {
    const condo = criarCondominio(ADMIN_ID, {
      nome: "Condomínio Integração",
      identificadorExterno: "INT-COND-1",
      status: "Ativo",
      advogados: ["Dra. Thamires"],
      administradora: "Admin Teste",
      cep: "40000-000",
      logradouro: "Rua Integração",
      numero: "1",
      complemento: "",
      cidade: "Salvador",
      estado: "BA",
      observacao: "",
    });
    assert.ok(condo.id > 0);

    const unidade = criarUnidade(ADMIN_ID, {
      condominioId: condo.id,
      identificacao: "201",
      bloco: "A",
      tipo: "Apartamento",
      status: "Ativa",
      situacao: "Em cobrança",
    });
    assert.equal(unidade.condominioId, condo.id);

    const cargoAtendente = getCadastros().cargos.find((item) => item.nome === "Atendente");
    assert.ok(cargoAtendente);

    const antes = getCadastros().usuarios.filter((u) => u.codigoRe).map((u) => u.codigoRe);
    const novo = await criarUsuario(ADMIN_ID, {
      codigo: "ATDINT",
      cargoId: cargoAtendente.id,
      nome: "Atendente Integração",
      telefone: "",
      email: "atd.int@example.invalid",
      senha: SENHA_DEMONSTRACAO,
      ativo: true,
    });
    assert.ok(novo.codigoRe);
    assert.match(novo.codigoRe, /^RE-\d{5}$/);
    const reservados = new Set(antes);
    assert.ok(!reservados.has(novo.codigoRe));
  });
});

describe("T21 — distribuição e redistribuição", () => {
  test("administradora redistribui unidade 102 para outro RE", () => {
    const resultado = distribuirUnidades(ADMIN_ID, {
      unidadeIds: [2],
      codigoRe: "RE-10001",
      motivo: "Teste redistribuição T21",
    });
    assert.equal(resultado.atribuidas, 1);
    const vigente = getCadastros().atribuicoesCobranca.find(
      (item) => item.unidadeId === 2 && !item.encerradoEm,
    );
    assert.ok(vigente);
    assert.equal(vigente.atendenteId, ATENDENTE_TASSIA_ID);
  });
});

describe("T21 — atendimento, retorno e histórico", () => {
  test("atendente registra tentativa, agenda retorno e conclui com histórico", () => {
    const atendimento = criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      responsavelId: 2,
      canal: "Telefone",
      respondeu: "Não",
      assunto: "T21 contato",
      descricao: "Sem retorno — agendar",
      status: "Pendente",
      dataProximaAcao: "2030-06-15T10:00:00",
      proximaAcao: "Nova tentativa",
    });
    assert.ok(atendimento.id);
    assert.ok(atendimento.dataProximaAcao);

    const concluido = concluirRetornoAgendado(ATENDENTE_RAQUEL_ID, atendimento.id);
    assert.ok(concluido.retornoConcluidoEm?.trim());

    const historico = obterHistoricoUnidade(ADMIN_ID, 2);
    const tipos = new Set(historico.eventos.map((e) => e.tipo));
    assert.ok(tipos.has("tentativa"));
    assert.ok(tipos.has("retorno_concluido"));
  });
});

describe("T21 — quitação fora da fila ativa", () => {
  test("unidade quitada sai da fila operacional", () => {
    assert.ok(listarFilaCobranca(ADMIN_ID).some((item) => item.unidadeId === 2));
    confirmarQuitacaoUnidade(ADMIN_ID, 2, { forcar: true });
    assert.ok(!listarFilaCobranca(ADMIN_ID).some((item) => item.unidadeId === 2));
    const historico = obterHistoricoUnidade(ADMIN_ID, 2);
    assert.ok(historico.eventos.length > 0);
  });
});

describe("T21 — escopo advogado", () => {
  test("advogado acessa condomínio permitido e é bloqueado em outro", () => {
    sincronizarCondominiosAdvogado(ADMIN_ID, ADVOGADO_ID, 3, "Dra. Adryelle", [1]);
    const permitidos = listarCondominios(ADVOGADO_ID);
    assert.ok(permitidos.some((c) => c.id === 1));
    assert.ok(!permitidos.some((c) => c.id === 2));

    obterUnidadeDetalhe(ADVOGADO_ID, 1);
    assert.throws(
      () => obterUnidadeDetalhe(ADVOGADO_ID, 3),
      (err: unknown) => err instanceof UnidadeServiceError && err.status === 403,
    );
  });
});

describe("T23 — painel de produtividade por RE", () => {
  test("atendente não acessa painel global de produtividade", () => {
    assert.throws(
      () =>
        montarPainelProdutividadePorRe(ATENDENTE_RAQUEL_ID, {
          ...filtrosPadrao(),
          de: "2020-01-01",
          ate: "2035-12-31",
        }),
      (err: unknown) => err instanceof RelatorioServiceError && err.status === 403,
    );
  });

  test("atendimento permanece no RE autor após redistribuição da carteira", () => {
    const filtros = {
      ...filtrosPadrao(),
      de: "2020-01-01",
      ate: "2035-12-31",
      codigoRe: "RE-10000",
    };
    const antes =
      montarPainelProdutividadePorRe(ADMIN_ID, filtros).linhas.find((item) => item.codigoRe === "RE-10000")
        ?.atendimentosRegistrados ?? 0;
    criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      canal: "Telefone",
      respondeu: "Não",
      status: "Resolvido",
      assunto: "T23 autor original",
    });
    distribuirUnidades(ADMIN_ID, {
      unidadeIds: [2],
      codigoRe: "RE-10001",
      motivo: "Redistribuição T23",
    });
    const linha = montarPainelProdutividadePorRe(ADMIN_ID, filtros).linhas.find((item) => item.codigoRe === "RE-10000");
    assert.ok(linha);
    assert.equal(linha?.atendimentosRegistrados, antes + 1);
    const outra = montarPainelProdutividadePorRe(ADMIN_ID, {
      ...filtrosPadrao(),
      de: "2020-01-01",
      ate: "2035-12-31",
      codigoRe: "RE-10001",
    }).linhas.find((item) => item.codigoRe === "RE-10001");
    assert.ok(!outra || outra.atendimentosRegistrados === 0);
  });

  test("retorno concluído conta pelo RE que concluiu", () => {
    const atendimento = criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      canal: "WhatsApp",
      respondeu: "Não",
      status: "Pendente",
      dataProximaAcao: "2030-08-01T10:00:00",
      proximaAcao: "Retornar",
    });
    concluirRetornoAgendado(ATENDENTE_RAQUEL_ID, atendimento.id);
    const painel = montarPainelProdutividadePorRe(ADMIN_ID, {
      ...filtrosPadrao(),
      de: "2020-01-01",
      ate: "2035-12-31",
    });
    const linha = painel.linhas.find((item) => item.codigoRe === "RE-10000");
    assert.ok(linha);
    assert.equal(linha?.retornosConcluidos, 1);
  });

  test("exportação produtividade por RE", () => {
    criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      canal: "WhatsApp",
      respondeu: "Não",
      status: "Resolvido",
      assunto: "T23 export",
    });
    const exportacao = montarExportRelatorio(ADMIN_ID, "produtividade", {
      ...filtrosPadrao(),
      de: "2020-01-01",
      ate: "2035-12-31",
      codigoRe: "RE-10000",
    });
    assert.equal(exportacao.titulo, "Produtividade por RE");
    const linhas = exportacao.secoes[0]?.linhas ?? [];
    assert.ok(linhas.some((l) => l[0] === "RE-10000" && Number(l[1]) > 0));
  });
});

describe("T21 — produtividade por RE e período", () => {
  test("administradora exporta produtividade filtrando RE", () => {
    criarAtendimento(ATENDENTE_RAQUEL_ID, {
      condominioId: 1,
      unidadeId: 2,
      canal: "WhatsApp",
      respondeu: "Não",
      status: "Resolvido",
      assunto: "T21 produtividade",
    });
    const filtros = { ...filtrosPadrao(), de: "2020-01-01", ate: "2035-12-31", codigoRe: "RE-10000" };
    const exportacao = montarExportRelatorio(ADMIN_ID, "equipe", filtros);
    assert.equal(exportacao.titulo, "Produtividade da equipe");
    const linhas = exportacao.secoes[0]?.linhas ?? [];
    assert.ok(linhas.length > 0);
    assert.ok(linhas.every((linha) => linha[3] === "RE-10000"));
  });
});

describe("T21 — importação inválida", () => {
  test("prévia com erros não altera débitos existentes", () => {
    const antes = getCadastros().debitos.length;
    const conteudo = "coluna-invalida;outra\nxxx;yyy\n";
    const preview = previewImportacaoDebitos(ADMIN_ID, {
      origem: "Outra administradora",
      arquivo: "invalido.csv",
      conteudo,
    });
    assert.ok(preview.erros > 0);
    assert.equal(preview.novos, 0);

    const resultado = confirmarImportacaoDebitos(ADMIN_ID, {
      origem: "Outra administradora",
      arquivo: "invalido.csv",
      conteudo,
    });
    assert.equal(getCadastros().debitos.length, antes);
    assert.equal(resultado.novos, 0);
    assert.equal(resultado.importacao.status, "Erro");
  });
});

describe("T21 — correção com auditoria", () => {
  test("atualizar débito registra evento de auditoria", () => {
    const debitoId = 1;
    const antes = getCadastros().auditoria.length;
    const original = obterDebito(ADMIN_ID, debitoId);
    atualizarDebito(ADMIN_ID, debitoId, {
      condominioId: original.condominioId,
      unidadeId: original.unidadeId,
      referencia: original.referencia,
      descricao: "Correção T21",
      dataVencimento: original.dataVencimento,
      valor: original.valor,
      valorAtualizado: original.valorAtualizado,
      status: original.status,
      origem: original.origem,
      identificadorExterno: original.identificadorExterno,
    });
    const eventos = getCadastros().auditoria.filter(
      (item) => item.entidade === "debt" && item.registroId === String(debitoId) && item.acao === "UPDATE",
    );
    assert.ok(getCadastros().auditoria.length > antes);
    assert.ok(eventos.length > 0);
  });
});

describe("T21 — filtros e exportação no escopo", () => {
  test("advogado não exporta atendimentos de condomínio fora da carteira", () => {
    sincronizarCondominiosAdvogado(ADMIN_ID, ADVOGADO_ID, 3, "Dra. Adryelle", [1]);
    criarAtendimento(ATENDENTE_TASSIA_ID, {
      condominioId: 2,
      unidadeId: 3,
      canal: "Telefone",
      respondeu: "Não",
      status: "Resolvido",
      assunto: "Condomínio 2 — fora do advogado",
    });
    const filtros = { ...filtrosPadrao(), de: "2020-01-01", ate: "2035-12-31" };
    const exportacao = montarExportRelatorio(ADVOGADO_ID, "equipe", filtros);
    const linhas = exportacao.secoes[0]?.linhas ?? [];
    const nomesCondominio = new Set(linhas.map((l) => l[1]));
    assert.ok(!nomesCondominio.has("Condomínio Teste 2"));
  });
});
