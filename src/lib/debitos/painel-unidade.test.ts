import assert from "node:assert/strict";
import test from "node:test";
import type { Cadastros, Debito, Unidade } from "@/data/catalogo";
import { classificarUnidadePainel, montarResumoPainelUnidade } from "@/lib/debitos/painel-unidade";

const catalogoMinimo: Cadastros = {
  cargos: [],
  usuarios: [],
  condominios: [{ id: 1, nome: "Cond", identificadorExterno: "", status: "Ativo", advogados: [], administradora: "", cep: "", logradouro: "", numero: "", complemento: "", cidade: "SP", estado: "SP", observacao: "", delinquencyTrackingDays: null }],
  unidades: [
    {
      id: 1,
      condominioId: 1,
      identificacao: "101",
      bloco: "A",
      tipo: "Apartamento",
      status: "Ativa",
      situacao: "Em cobrança",
    } satisfies Unidade,
    {
      id: 2,
      condominioId: 1,
      identificacao: "102",
      bloco: "A",
      tipo: "Apartamento",
      status: "Ativa",
      situacao: "Em acordo",
    } satisfies Unidade,
    {
      id: 3,
      condominioId: 1,
      identificacao: "103",
      bloco: "A",
      tipo: "Apartamento",
      status: "Ativa",
      situacao: "Quitada",
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

test("classifica unidade em aberto, negociação, quitada e em dia", () => {
  const dataBase = "2025-03-01";
  const u1 = catalogoMinimo.unidades[0]!;
  const u2 = catalogoMinimo.unidades[1]!;
  const u3 = catalogoMinimo.unidades[2]!;
  const d1 = debitoBase({ id: 1, unidadeId: 1, status: "Vencido" });
  const d2 = debitoBase({ id: 2, unidadeId: 2, status: "Vencido" });

  assert.equal(classificarUnidadePainel(u1, [d1], dataBase, catalogoMinimo), "em_aberto");
  assert.equal(classificarUnidadePainel(u2, [d2], dataBase, catalogoMinimo), "em_negociacao");
  assert.equal(classificarUnidadePainel(u3, [], dataBase, catalogoMinimo), "quitada");
  assert.equal(classificarUnidadePainel(u1, [], dataBase, catalogoMinimo), "em_dia");
});

test("monta resumo com total e evolução de cinco meses", () => {
  const dataBase = "2025-05-31";
  const debitos = [
    debitoBase({ id: 10, unidadeId: 1, status: "Vencido" }),
    debitoBase({ id: 11, unidadeId: 2, status: "Vencido" }),
  ];
  const resumo = montarResumoPainelUnidade(catalogoMinimo.unidades, debitos, dataBase, catalogoMinimo);
  assert.equal(resumo.totalUnidades, 3);
  assert.equal(resumo.evolucao.length, 5);
  assert.equal(resumo.fatias.find((f) => f.id === "em_negociacao")?.quantidade, 1);
  assert.equal(resumo.fatias.find((f) => f.id === "em_aberto")?.quantidade, 1);
  assert.equal(resumo.fatias.find((f) => f.id === "quitada")?.quantidade, 1);
});