import assert from "node:assert/strict";
import test from "node:test";
import type { Cadastros, Condominio, Debito } from "@/data/catalogo";
import { calcularIndicadoresInadimplencia } from "./indicadores";

function condominio(id: number, delinquencyTrackingDays: number | null): Condominio {
  return {
    id,
    nome: `Condomínio ${id}`,
    identificadorExterno: "",
    status: "Ativo",
    advogados: ["Adv"],
    administradora: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    cidade: "",
    estado: "",
    observacao: "",
    delinquencyTrackingDays,
  };
}

const baseCatalog: Cadastros = {
  cargos: [],
  usuarios: [],
  condominios: [
    condominio(1, 30),
    condominio(2, 90),
  ],
  unidades: [],
  responsaveis: [],
  vinculos: [],
  debitos: [],
  atendimentos: [],
  atribuicoes: [],
  importacoes: [],
  auditoria: [],
  propostas: [],
  parcelasAcordo: [],
  pagamentosAcordo: [],
  encaminhamentosJuridicos: [],
  documentosJuridicos: [],
  notificacoes: [],
  falhasNotificacao: [],
};

test("indicadores respeitam prazo distinto por condomínio", () => {
  const debitos: Debito[] = [
    {
      id: 1,
      condominioId: 1,
      unidadeId: 10,
      referencia: "01/2026",
      descricao: "Cota",
      dataVencimento: "2026-01-01",
      valor: "100",
      valorOriginal: "100",
      multa: "0",
      juros: "0",
      correcao: "0",
      valorAtualizado: "100",
      status: "Vencido",
      dataPagamento: "",
      valorPago: "",
      origem: "PDF",
      identificadorExterno: "A1",
      fonteValores: "origem",
      atualizadoEm: "2026-01-01",
    },
    {
      id: 2,
      condominioId: 2,
      unidadeId: 20,
      referencia: "01/2026",
      descricao: "Cota",
      dataVencimento: "2026-01-01",
      valor: "200",
      valorOriginal: "200",
      multa: "0",
      juros: "0",
      correcao: "0",
      valorAtualizado: "200",
      status: "Vencido",
      dataPagamento: "",
      valorPago: "",
      origem: "PDF",
      identificadorExterno: "A2",
      fonteValores: "origem",
      atualizadoEm: "2026-01-01",
    },
  ];

  const dataBase = "2026-02-11";
  const indicadores = calcularIndicadoresInadimplencia({
    debitos,
    dataBase,
    unidadesCarteira: 2,
    catalog: baseCatalog,
  });

  assert.equal(indicadores.ateLimite, 200);
  assert.equal(indicadores.acimaLimite, 100);
});
