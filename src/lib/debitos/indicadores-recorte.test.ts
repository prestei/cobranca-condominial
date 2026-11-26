import assert from "node:assert/strict";
import test from "node:test";
import type { Debito } from "@/data/catalogo";
import { calcularIndicadoresRecorte } from "@/lib/debitos/indicadores-recorte";

const catalogoMinimo = {
  cargos: [],
  usuarios: [],
  condominios: [],
  unidades: [],
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
  atribuicoesCobranca: [],
} as const;

function debito(partial: Partial<Debito> & Pick<Debito, "id">): Debito {
  return {
    condominioId: 1,
    unidadeId: 1,
    referencia: "01/2025",
    descricao: "",
    dataVencimento: "2025-01-10",
    valor: "100",
    valorOriginal: "100",
    multa: "0",
    juros: "0",
    correcao: "0",
    valorAtualizado: "100",
    status: "Vencido",
    dataPagamento: "",
    valorPago: "0",
    origem: "",
    identificadorExterno: "",
    situacaoInadimplencia: "Ativa",
    justificativaPrescricao: "",
    usuarioPrescricaoId: null,
    prescritoEm: "",
    atualizadoEm: "",
    fonteValores: "origem",
    situacaoOperacional: "",
    situacaoOperacionalAlteradaEm: "",
    usuarioSituacaoOperacionalId: null,
    ...partial,
  };
}

test("indicadores do recorte não somam o mesmo identificador externo duas vezes", () => {
  const duplicado = debito({ id: 1, identificadorExterno: "EXT-1", valorOriginal: "50" });
  const duplicado2 = debito({ id: 2, identificadorExterno: "EXT-1", valorOriginal: "50" });
  const indicadores = calcularIndicadoresRecorte(
    "em_aberto",
    [duplicado, duplicado2],
    "2025-03-01",
    catalogoMinimo,
    new Map(),
  );
  const original = indicadores.find((item) => item.id === "original");
  assert.equal(original?.valor, "R$ 50,00");
});