import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
  SITUACAO_INADIMPLENCIA_ATIVA,
  SITUACAO_INADIMPLENCIA_PRESCRITA,
  type Debito,
} from "@/data/catalogo";
import {
  debitoInadimplenciaAtiva,
  inferirSituacaoOperacionalDebito,
  SITUACAO_OPERACIONAL_EM_ABERTO,
  SITUACAO_OPERACIONAL_EM_NEGOCIACAO,
  SITUACAO_OPERACIONAL_PRESCRITA,
  SITUACAO_OPERACIONAL_QUITADA,
} from "@/lib/debitos/operational-situation";
import {
  resolverTransicaoPeriodoInadimplencia,
  unidadeInadimplenteOperacional,
} from "@/lib/unidades/delinquency-periods";
import { debitoEmAbertoOperacional } from "@/data/catalogo";
import { filtrarDebitosPorRecorteListagem } from "@/lib/debitos/painel-situacao";

function debito(partial: Partial<Debito> & Pick<Debito, "id" | "status">): Debito {
  return {
    id: partial.id,
    condominioId: partial.condominioId ?? 1,
    unidadeId: partial.unidadeId ?? 1,
    referencia: partial.referencia ?? "01/2026",
    descricao: "",
    dataVencimento: partial.dataVencimento ?? "2026-01-10",
    valor: "100",
    valorOriginal: "100",
    multa: "",
    juros: "",
    correcao: "",
    valorAtualizado: "100",
    status: partial.status,
    dataPagamento: partial.dataPagamento ?? "",
    valorPago: partial.valorPago ?? "",
    origem: "",
    identificadorExterno: "",
    atualizadoEm: "",
    fonteValores: "manual",
    situacaoInadimplencia: partial.situacaoInadimplencia ?? SITUACAO_INADIMPLENCIA_ATIVA,
    usuarioPrescricaoId: null,
    prescritoEm: partial.prescritoEm ?? "",
    justificativaPrescricao: "",
    situacaoOperacional: partial.situacaoOperacional ?? "",
    situacaoOperacionalAlteradaEm: "",
    usuarioSituacaoOperacionalId: null,
  };
}

describe("T24 — situação operacional do débito", () => {
  test("dívida quitada não entra na inadimplência ativa", () => {
    const quitada = debito({
      id: 1,
      status: "Pago",
      dataPagamento: "2026-11-01",
      valorPago: "100",
      situacaoOperacional: SITUACAO_OPERACIONAL_QUITADA,
    });
    assert.equal(debitoInadimplenciaAtiva(quitada), false);
    assert.equal(debitoEmAbertoOperacional(quitada), false);
    const ativos = filtrarDebitosPorRecorteListagem([quitada], "em_aberto", "2026-11-16", {
      unidades: [],
      condominios: [],
      debitos: [],
      propostasNegociacao: [],
    } as never);
    assert.equal(ativos.length, 0);
  });

  test("dívida prescrita não entra na fila operacional", () => {
    const prescrita = debito({
      id: 2,
      status: "Vencido",
      situacaoInadimplencia: SITUACAO_INADIMPLENCIA_PRESCRITA,
      situacaoOperacional: SITUACAO_OPERACIONAL_PRESCRITA,
    });
    assert.equal(debitoInadimplenciaAtiva(prescrita), false);
    assert.equal(inferirSituacaoOperacionalDebito(prescrita, false), SITUACAO_OPERACIONAL_PRESCRITA);
  });

  test("dívida prescrita em acordo formalizado permanece em negociação na fila", () => {
    const prescrita = debito({
      id: 20,
      status: "Vencido",
      situacaoInadimplencia: SITUACAO_INADIMPLENCIA_PRESCRITA,
      situacaoOperacional: SITUACAO_OPERACIONAL_PRESCRITA,
    });
    assert.equal(inferirSituacaoOperacionalDebito(prescrita, true), SITUACAO_OPERACIONAL_EM_NEGOCIACAO);
    assert.equal(debitoInadimplenciaAtiva({ situacaoOperacional: SITUACAO_OPERACIONAL_EM_NEGOCIACAO }), true);
  });

  test("alterar para quitada preserva histórico no recorte Quitadas", () => {
    const aberto = debito({ id: 3, status: "Vencido", situacaoOperacional: SITUACAO_OPERACIONAL_EM_ABERTO });
    const quitada = debito({
      ...aberto,
      status: "Pago",
      dataPagamento: "2026-11-15",
      valorPago: "100",
      situacaoOperacional: SITUACAO_OPERACIONAL_QUITADA,
    });
    const historico = filtrarDebitosPorRecorteListagem([quitada], "quitadas", "2026-11-16", {
      unidades: [],
      condominios: [],
      debitos: [],
      propostasNegociacao: [],
    } as never);
    assert.equal(historico.length, 1);
    assert.equal(aberto.situacaoOperacional, SITUACAO_OPERACIONAL_EM_ABERTO);
  });

  test("nova dívida na mesma unidade restaura inadimplência", () => {
    const quitada = debito({
      id: 4,
      status: "Pago",
      situacaoOperacional: SITUACAO_OPERACIONAL_QUITADA,
      dataPagamento: "2026-11-01",
    });
    const nova = debito({
      id: 5,
      unidadeId: 1,
      status: "Vencido",
      situacaoOperacional: SITUACAO_OPERACIONAL_EM_ABERTO,
      dataVencimento: "2026-12-20",
    });
    const debitos = [quitada, nova];
    assert.equal(unidadeInadimplenteOperacional(debitos, "2026-12-25"), true);
  });

  test("período anterior permanece ao reabrir inadimplência", () => {
    const transicao1 = resolverTransicaoPeriodoInadimplencia(
      [debito({ id: 10, status: "Vencido", situacaoOperacional: SITUACAO_OPERACIONAL_EM_ABERTO })],
      null,
      "2026-08-10",
    );
    assert.equal(transicao1.tipo, "abrir");
    const periodoFechado = {
      id: 1,
      unidadeId: 1,
      inicioEm: "2026-08-10",
      fimEm: "2026-11-15",
      usuarioAberturaId: null,
      usuarioEncerramentoId: null,
    };
    const transicao2 = resolverTransicaoPeriodoInadimplencia(
      [debito({ id: 11, status: "Vencido", situacaoOperacional: SITUACAO_OPERACIONAL_EM_ABERTO, dataVencimento: "2026-12-20" })],
      null,
      "2026-12-25",
    );
    assert.equal(transicao2.tipo, "abrir");
    assert.equal(periodoFechado.fimEm, "2026-11-15");
  });

  test("negociação formal muda situação do débito vinculado", () => {
    const emNeg = inferirSituacaoOperacionalDebito(debito({ id: 6, status: "Vencido" }), true);
    assert.equal(emNeg, SITUACAO_OPERACIONAL_EM_NEGOCIACAO);
  });

  test("unidade com múltiplas dívidas e estados distintos", () => {
    const debitos = [
      debito({ id: 7, status: "Vencido", situacaoOperacional: SITUACAO_OPERACIONAL_EM_ABERTO }),
      debito({ id: 8, status: "Pago", situacaoOperacional: SITUACAO_OPERACIONAL_QUITADA, dataPagamento: "2026-10-01" }),
      debito({
        id: 9,
        status: "Vencido",
        situacaoOperacional: SITUACAO_OPERACIONAL_PRESCRITA,
        situacaoInadimplencia: SITUACAO_INADIMPLENCIA_PRESCRITA,
      }),
    ];
    assert.equal(debitos.filter(debitoInadimplenciaAtiva).length, 1);
    assert.equal(unidadeInadimplenteOperacional(debitos, "2026-11-16"), true);
  });
});