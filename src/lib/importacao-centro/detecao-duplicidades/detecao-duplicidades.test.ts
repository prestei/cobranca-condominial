import assert from "node:assert/strict";
import test from "node:test";
import type { Debito } from "@/data/catalogo";
import type { DebitoImportRow } from "@/lib/importacoes/importar-debitos-planilha";
import type { Unidade } from "@/data/catalogo";
import type { UnidadeInput } from "@/lib/unidades/service";
import {
  chaveDuplicidadeUnidadeNoArquivo,
  chaveNaturalDebito,
  detectarDuplicidadeDebito,
  detectarDuplicidadeCondominio,
  detectarDuplicidadeResponsavel,
  detectarDuplicidadeUnidade,
} from "@/lib/importacao-centro/detecao-duplicidades";
import { aplicarDecisoesNasLinhas } from "@/lib/importacao-centro/detecao-duplicidades/aplicar-decisoes";
import type { LinhaConferencia } from "@/lib/importacao-centro/types";

function rowBase(overrides: Partial<DebitoImportRow> = {}): DebitoImportRow {
  return {
    condominioId: 1,
    unidadeId: 10,
    referencia: "09/2026",
    descricao: "Taxa condominial",
    dataVencimento: "2026-09-10",
    valor: "500.00",
    valorOriginal: "500.00",
    multa: "0",
    juros: "0",
    correcao: "0",
    valorAtualizado: "500.00",
    status: "Em aberto",
    dataPagamento: "",
    valorPago: "",
    identificadorExterno: "",
    ...overrides,
  };
}

test("chaveNaturalDebito distingue vencimentos com mesma referência", () => {
  const a = rowBase({ dataVencimento: "2026-09-10" });
  const b = rowBase({ dataVencimento: "2026-10-10" });
  assert.notEqual(chaveNaturalDebito(a), chaveNaturalDebito(b));
});

test("detectarDuplicidadeDebito não considera duplicata só pela referência", () => {
  const existente: Debito = {
    id: 1,
    ...rowBase({ dataVencimento: "2026-09-10" }),
    origem: "manual",
    atualizadoEm: "",
    fonteValores: "manual",
  };
  const candidato = rowBase({ dataVencimento: "2026-10-10" });
  const detecao = detectarDuplicidadeDebito(candidato, [existente]);
  assert.equal(detecao.correspondencia, "nenhuma");
});

test("detectarDuplicidadeDebito marca revisão quando ID externo coincide com divergência", () => {
  const existente: Debito = {
    id: 2,
    ...rowBase({ identificadorExterno: "ADM-1", valorAtualizado: "500.00" }),
    origem: "import",
    atualizadoEm: "",
    fonteValores: "origem",
  };
  const candidato = rowBase({ identificadorExterno: "ADM-1", valorAtualizado: "550.00" });
  const detecao = detectarDuplicidadeDebito(candidato, [existente]);
  assert.equal(detecao.correspondencia, "possivel");
  assert.ok(detecao.acoesPermitidas.includes("atualizar_existente"));
  assert.equal(detecao.acaoPadrao, "revisao_manual");
});

test("aplicarDecisoesNasLinhas exige decisão explícita para atualizar", () => {
  const linhas: LinhaConferencia[] = [
    {
      linha: 2,
      situacao: "revisao",
      conflito: {
        correspondencia: "possivel",
        acoesPermitidas: ["atualizar_existente", "ignorar_existente"],
        acaoPadrao: "revisao_manual",
      },
    },
  ];
  const semDecisao = aplicarDecisoesNasLinhas(linhas);
  assert.equal(semDecisao.linhas[0]?.situacao, "ignorado");

  const comDecisao = aplicarDecisoesNasLinhas(linhas, [{ linha: 2, acao: "atualizar_existente" }]);
  assert.equal(comDecisao.linhas[0]?.situacao, "atualizacao");
});

test("detectarDuplicidadeCondominio: mesmo nome sem ID externo gera possível correspondência", () => {
  const detecao = detectarDuplicidadeCondominio(
    {
      nome: "Residencial Aurora",
      identificadorExterno: "",
      advogados: ["Dr. A"],
      status: "Ativo",
      cidade: "",
      estado: "",
      administradora: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      observacao: "",
    },
    [
      {
        id: 9,
        nome: "Residencial Aurora",
        identificadorExterno: "",
        advogados: ["Dr. A"],
        status: "Ativo",
        cidade: "",
        estado: "",
        administradora: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        observacao: "",
      },
    ],
  );
  assert.equal(detecao.correspondencia, "possivel");
});

test("detectarDuplicidadeUnidade usa condomínio, bloco e código", () => {
  const payload: UnidadeInput = {
    condominioId: 3,
    identificacao: "101",
    bloco: "A",
    tipo: "Apartamento",
    situacao: "Ativa",
  };
  const existentes: Unidade[] = [
    {
      id: 7,
      condominioId: 3,
      identificacao: "101",
      bloco: "A",
      tipo: "Apartamento",
      situacao: "Ativa",
    },
  ];
  const detecao = detectarDuplicidadeUnidade(payload, existentes);
  assert.equal(detecao.correspondencia, "exata");
  assert.equal(chaveDuplicidadeUnidadeNoArquivo(payload), "3:a:101");
});

test("detectarDuplicidadeResponsavel confirma por documento", () => {
  const detecao = detectarDuplicidadeResponsavel(
    { nome: "Maria", cpfCnpj: "123.456.789-09" },
    [{ id: 1, nome: "Maria Silva", cpfCnpj: "12345678909", email: "", telefone: "" }],
  );
  assert.equal(detecao.correspondencia, "exata");
  assert.ok(detecao.acoesPermitidas.includes("atualizar_existente"));
});

test("detectarDuplicidadeCondominio: ID externo coincide", () => {
  const detecao = detectarDuplicidadeCondominio(
    {
      nome: "Torre Norte",
      identificadorExterno: "ADM-99",
      advogados: [],
      status: "Ativo",
      cidade: "",
      estado: "",
      administradora: "",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      observacao: "",
    },
    [
      {
        id: 2,
        nome: "Outro nome",
        identificadorExterno: "ADM-99",
        advogados: [],
        status: "Ativo",
        cidade: "",
        estado: "",
        administradora: "",
        cep: "",
        logradouro: "",
        numero: "",
        complemento: "",
        observacao: "",
      },
    ],
  );
  assert.equal(detecao.correspondencia, "exata");
  assert.equal(detecao.acaoPadrao, "ignorar_existente");
});
