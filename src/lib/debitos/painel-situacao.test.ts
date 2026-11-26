import assert from "node:assert/strict";
import test from "node:test";
import type { Cadastros, Debito, Unidade } from "@/data/catalogo";
import {
  classificarDebitoSituacaoPainel,
  montarResumoPainelSituacao,
  recorteListagemInadimplencia,
} from "@/lib/debitos/painel-situacao";

const catalogoMinimo: Cadastros = {
  cargos: [],
  usuarios: [],
  condominios: [],
  unidades: [
    {
      id: 1,
      condominioId: 1,
      identificador: "101",
      grupo: "A",
      tipo: "Apartamento",
      status: "Ativa",
      situacao: "Em cobrança",
    } satisfies Unidade,
    {
      id: 2,
      condominioId: 1,
      identificador: "102",
      grupo: "A",
      tipo: "Apartamento",
      status: "Ativa",
      situacao: "Em acordo",
    } satisfies Unidade,
  ],
  responsaveis: [],
  vinculos: [],
  debitos: [],
  atendimentos: [],
  atribuicoes: [],
  importacoes: [],
  auditoria: [],
  propostas: [],
  propostasNegociacao: [],
  encaminhamentosJuridicos: [],
  notificacoesInternas: [],
  acordos: [],
  limitesNegociacao: [],
  documentos: [],
  templates: [],
};

function debitoBase(partial: Partial<Debito> & Pick<Debito, "id" | "unidadeId" | "status">): Debito {
  return {
    condominioId: 1,
    referencia: "01/2025",
    descricao: "",
    dataVencimento: "2025-01-10",
    valor: "100",
    valorOriginal: "100",
    multa: "0",
    juros: "0",
    correcao: "0",
    valorAtualizado: "100",
    dataPagamento: "",
    valorPago: "0",
    origem: "PDF",
    identificadorExterno: "",
    situacaoInadimplencia: "Ativa",
    justificativaPrescricao: "",
    usuarioPrescricaoId: null,
    prescritoEm: "",
    atualizadoEm: "",
    fonteValores: "origem" as const,
    situacaoOperacional: "",
    situacaoOperacionalAlteradaEm: "",
    usuarioSituacaoOperacionalId: null,
    ...partial,
  };
}

test("classifica em aberto, negociação, quitada e prescrita", () => {
  const dataBase = "2025-03-01";
  const aberto = debitoBase({ id: 1, unidadeId: 1, status: "Vencido" });
  const negociacao = debitoBase({ id: 2, unidadeId: 2, status: "Vencido" });
  const quitada = debitoBase({
    id: 3,
    unidadeId: 1,
    status: "Pago",
    dataPagamento: "2025-02-15",
  });
  const prescrita = debitoBase({
    id: 4,
    unidadeId: 1,
    status: "Vencido",
    situacaoInadimplencia: "Inadimplência prescrita",
  });

  assert.equal(classificarDebitoSituacaoPainel(aberto, dataBase, catalogoMinimo), "em_aberto");
  assert.equal(classificarDebitoSituacaoPainel(negociacao, dataBase, catalogoMinimo), "em_negociacao");
  assert.equal(classificarDebitoSituacaoPainel(quitada, dataBase, catalogoMinimo), "quitadas");
  assert.equal(classificarDebitoSituacaoPainel(prescrita, dataBase, catalogoMinimo), "prescritas");
});

test("histórico cobre cancelados e vencimentos futuros no recorte", () => {
  const dataBase = "2025-03-01";
  const cancelado = debitoBase({ id: 20, unidadeId: 1, status: "Cancelado" });
  const futuro = debitoBase({
    id: 21,
    unidadeId: 1,
    status: "Pendente",
    dataVencimento: "2025-06-01",
  });
  assert.equal(recorteListagemInadimplencia(cancelado, dataBase, catalogoMinimo), "historico");
  assert.equal(recorteListagemInadimplencia(futuro, dataBase, catalogoMinimo), "historico");
});

test("quitada na data-base mesmo com situacao_operacional desatualizada", () => {
  const dataBase = "2025-03-01";
  const quitada = debitoBase({
    id: 30,
    unidadeId: 1,
    status: "Pago",
    dataPagamento: "2025-02-15",
    valorPago: "100",
    situacaoOperacional: "Em aberto",
  });
  assert.equal(classificarDebitoSituacaoPainel(quitada, dataBase, catalogoMinimo), "quitadas");
});

test("unidade em negociação na fila inclui todos os débitos ativos no recorte, não só os da proposta", () => {
  const dataBase = "2026-11-26";
  const cadastros: Cadastros = {
    ...catalogoMinimo,
    propostasNegociacao: [
      {
        id: "prop-parcial",
        condominioId: 1,
        unidadeId: 1,
        usuarioId: 1,
        criadoEm: "2025-01-01T12:00:00.000Z",
        status: "Em análise",
        valorProposto: "80",
        observacoes: "",
        debitoIds: [50],
        acordoConfirmadoEm: "",
        acordoConfirmadoPorId: null,
        termosAprovados: "",
        advogadoResponsavelId: null,
        valorDividaOriginal: "100",
        valorDividaAtualizada: "100",
        quantidadeParcelas: 3,
        valoresDefinidosPorId: 1,
        valoresAprovadosPorId: null,
        filaNegociacaoEm: "2025-02-01T10:00:00.000Z",
        filaNegociacaoPorId: 1,
      },
    ],
  };
  const naProposta = debitoBase({
    id: 50,
    unidadeId: 1,
    status: "Vencido",
    situacaoOperacional: "Em negociação",
    dataVencimento: "2020-02-05",
  });
  const foraDaProposta = debitoBase({
    id: 51,
    unidadeId: 1,
    status: "Vencido",
    situacaoOperacional: "Em aberto",
    dataVencimento: "2020-02-05",
  });

  assert.equal(classificarDebitoSituacaoPainel(naProposta, dataBase, cadastros), "em_negociacao");
  assert.equal(classificarDebitoSituacaoPainel(foraDaProposta, dataBase, cadastros), "em_negociacao");
});

test("débito com inadimplência prescrita permanece em negociação quando há acordo ativo na unidade", () => {
  const dataBase = "2026-11-26";
  const cadastros: Cadastros = {
    ...catalogoMinimo,
    propostasNegociacao: [
      {
        id: "prop-prescrita",
        condominioId: 1,
        unidadeId: 1,
        usuarioId: 1,
        criadoEm: "2025-01-01T12:00:00.000Z",
        status: "Aceita",
        valorProposto: "1700",
        observacoes: "",
        debitoIds: [60],
        acordoConfirmadoEm: "2026-01-01T12:00:00.000Z",
        acordoConfirmadoPorId: 1,
        termosAprovados: "",
        advogadoResponsavelId: null,
        valorDividaOriginal: "850",
        valorDividaAtualizada: "850",
        quantidadeParcelas: 0,
        valoresDefinidosPorId: 1,
        valoresAprovadosPorId: null,
        filaNegociacaoEm: "",
        filaNegociacaoPorId: null,
      },
    ],
  };
  const prescritoEmNegociacao = debitoBase({
    id: 60,
    unidadeId: 1,
    status: "Vencido",
    situacaoOperacional: "Em negociação",
    situacaoInadimplencia: "Inadimplência prescrita",
    dataVencimento: "2020-02-05",
  });
  assert.equal(classificarDebitoSituacaoPainel(prescritoEmNegociacao, dataBase, cadastros), "em_negociacao");
});

test("proposta ativa classifica em negociação mesmo com situacao_operacional Em aberto", () => {
  const dataBase = "2025-03-01";
  const cadastros: Cadastros = {
    ...catalogoMinimo,
    propostasNegociacao: [
      {
        id: "prop-1",
        condominioId: 1,
        unidadeId: 1,
        usuarioId: 1,
        criadoEm: "2025-01-01T12:00:00.000Z",
        status: "Em análise",
        valorProposto: "80",
        observacoes: "",
        debitoIds: [40],
        acordoConfirmadoEm: "",
        acordoConfirmadoPorId: null,
        termosAprovados: "",
        advogadoResponsavelId: null,
        valorDividaOriginal: "100",
        valorDividaAtualizada: "100",
        quantidadeParcelas: 3,
        valoresDefinidosPorId: 1,
        valoresAprovadosPorId: null,
        filaNegociacaoEm: "",
        filaNegociacaoPorId: null,
      },
    ],
  };
  const emNegociacao = debitoBase({
    id: 40,
    unidadeId: 1,
    status: "Vencido",
    situacaoOperacional: "Em aberto",
  });
  assert.equal(classificarDebitoSituacaoPainel(emNegociacao, dataBase, cadastros), "em_negociacao");
});

test("monta resumo com total e evolução de cinco meses", () => {
  const dataBase = "2025-05-31";
  const debitos = [
    debitoBase({ id: 10, unidadeId: 1, status: "Vencido" }),
    debitoBase({ id: 11, unidadeId: 2, status: "Vencido" }),
    debitoBase({ id: 12, unidadeId: 1, status: "Pago", dataPagamento: "2025-04-01" }),
  ];
  const resumo = montarResumoPainelSituacao(debitos, dataBase, catalogoMinimo);
  assert.equal(resumo.totalRegistros, 3);
  assert.equal(resumo.evolucao.length, 5);
  assert.equal(resumo.fatias.find((f) => f.id === "em_negociacao")?.quantidade, 1);
  assert.equal(resumo.fatias.find((f) => f.id === "em_aberto")?.quantidade, 1);
  assert.equal(resumo.fatias.find((f) => f.id === "quitadas")?.quantidade, 1);
});