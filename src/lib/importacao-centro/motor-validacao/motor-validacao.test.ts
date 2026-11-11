import assert from "node:assert/strict";
import test from "node:test";
import { getCadastros } from "@/data/catalogo-store";
import { classificarResultadoValidacao } from "@/lib/importacao-centro/motor-validacao/classificacao";
import { aplicarMotorValidacaoImportacao } from "@/lib/importacao-centro/motor-validacao/motor";
import type { LinhaParseada } from "@/lib/importacao-centro/types";
import { validadorImportacaoDebitos } from "@/lib/importacao-centro/motor-validacao/modulos/debitos";
import type { ContextoImportacaoDebitos } from "@/lib/importacao-centro/adaptadores/debitos";
import type { DebitoImportRow } from "@/lib/importacoes/importar-debitos-planilha";

test("classificarResultadoValidacao distingue erro, atenção e válido", () => {
  assert.equal(
    classificarResultadoValidacao([
      { categoria: "cadastral", severidade: "erro", codigo: "a", mensagem: "x" },
    ]),
    "erro",
  );
  assert.equal(
    classificarResultadoValidacao([
      { categoria: "estrutural", severidade: "atencao", codigo: "b", mensagem: "y" },
    ]),
    "atencao",
  );
  assert.equal(classificarResultadoValidacao([]), "valido");
});

test("aplicarMotorValidacaoImportacao enriquece linhas sem gravar", () => {
  const contexto: ContextoImportacaoDebitos = {
    condominios: [{ id: 1, nome: "Alpha", identificadorExterno: "" }],
    unidades: [{ id: 10, condominioId: 1, identificacao: "101", bloco: "", status: "Ativa" }],
    debitos: [],
    debitosMutaveis: [],
    idsCondominioEscopo: new Set([1]),
    unidadeIdsComDebitoImportado: new Set(),
  };

  const matriz = [
    ["Unidade", "Condomínio", "Referência", "Vencimento", "Valor", "Coluna Extra"],
    ["101", "Alpha", "09/2026", "2026-09-19", "100,00", "x"],
  ];

  const parseadas: LinhaParseada<DebitoImportRow>[] = [
    {
      linha: 2,
      payload: {
        condominioId: 1,
        unidadeId: 10,
        referencia: "09/2026",
        descricao: "",
        dataVencimento: "2026-09-19",
        valor: "100.00",
        valorOriginal: "100.00",
        multa: "0.00",
        juros: "0.00",
        correcao: "0.00",
        valorAtualizado: "100.00",
        status: "Vencido",
        dataPagamento: "",
        valorPago: "",
        identificadorExterno: "",
      },
    },
  ];

  const { linhas, registros, inconsistenciasArquivo } = aplicarMotorValidacaoImportacao(parseadas, {
    modulo: validadorImportacaoDebitos.modulo,
    matriz,
    contexto,
  });

  assert.equal(linhas.length, 1);
  assert.ok(linhas[0].validacao);
  assert.equal(linhas[0].validacao?.resultado, "valido");
  assert.ok(
    inconsistenciasArquivo.some((item) => item.codigo === "estrutural.coluna_desconhecida"),
  );
  assert.equal(registros.length, 1);
  assert.equal(registros[0].identificador, "debitos:linha:2");
});

test("motor sinaliza data ambígua da normalização sem descartar o original", () => {
  const contexto: ContextoImportacaoDebitos = {
    condominios: [{ id: 1, nome: "Alpha", identificadorExterno: "" }],
    unidades: [{ id: 10, condominioId: 1, identificacao: "101", bloco: "", status: "Ativa" }],
    debitos: [],
    debitosMutaveis: [],
    idsCondominioEscopo: new Set([1]),
    unidadeIdsComDebitoImportado: new Set(),
  };

  const parseadas: LinhaParseada<DebitoImportRow>[] = [
    {
      linha: 2,
      payload: {
        condominioId: 1,
        unidadeId: 10,
        referencia: "09/2026",
        descricao: "Taxa",
        dataVencimento: "2026-06-05",
        valor: "100.00",
        valorOriginal: "100.00",
        multa: "0.00",
        juros: "0.00",
        correcao: "0.00",
        valorAtualizado: "100.00",
        status: "Vencido",
        dataPagamento: "",
        valorPago: "",
        identificadorExterno: "",
        metaOrigem: { interpretacaoSegura: true, responsavel: "Fulano" },
      },
      camposNormalizados: {
        dataVencimento: {
          original: "05-06-2026",
          normalizado: "2026-06-05",
          vazio: false,
          ambiguo: true,
        },
      },
    },
  ];

  const { linhas } = aplicarMotorValidacaoImportacao(parseadas, {
    modulo: "debitos",
    matriz: [["Unidade", "Condomínio", "Referência", "Vencimento", "Valor"], ["101", "Alpha", "09/2026", "05-06-2026", "100,00"]],
    contexto,
  });

  assert.equal(linhas[0].validacao?.resultado, "atencao");
  assert.ok(linhas[0].validacao?.inconsistencias.some((item) => item.codigo === "normalizacao.campo_ambiguo"));
  assert.equal(linhas[0].validacao?.camposNormalizados?.dataVencimento.original, "05-06-2026");
  assert.equal(linhas[0].validacao?.camposNormalizados?.dataVencimento.normalizado, "2026-06-05");
  assert.ok(linhas[0].payload);
});

test("nenhum registro segue sem validação — módulo sem validador ainda recebe resultado", () => {
  const { linhas, registros } = aplicarMotorValidacaoImportacao([{ linha: 2, payload: { codigo: "A" } }], {
    modulo: "modulo-inexistente-ticket-05",
    matriz: [["Codigo"], ["A"]],
    contexto: {},
  });
  assert.equal(registros.length, 1);
  assert.ok(linhas[0].validacao);
  assert.equal(linhas[0].validacao?.resultado, "valido");
  assert.ok(linhas[0].validacao?.regrasAplicadas.includes("motor.validador_generico"));
  assert.equal(linhas[0].validacao?.identificador, "modulo-inexistente-ticket-05:linha:2");
});

test("aviso de coluna desconhecida não vira erro bloqueante", () => {
  const contexto: ContextoImportacaoDebitos = {
    condominios: [{ id: 1, nome: "Alpha", identificadorExterno: "", status: "Ativo" }],
    unidades: [{ id: 10, condominioId: 1, identificacao: "101", bloco: "", status: "Ativa", situacao: "Em cobrança" }],
    debitos: [],
    debitosMutaveis: [],
    idsCondominioEscopo: new Set([1]),
    unidadeIdsComDebitoImportado: new Set(),
  };
  const parseadas: LinhaParseada<DebitoImportRow>[] = [
    {
      linha: 2,
      payload: {
        condominioId: 1,
        unidadeId: 10,
        referencia: "09/2026",
        descricao: "Taxa",
        dataVencimento: "2026-09-19",
        valor: "100.00",
        valorOriginal: "100.00",
        multa: "0.00",
        juros: "0.00",
        correcao: "0.00",
        valorAtualizado: "100.00",
        status: "Vencido",
        dataPagamento: "",
        valorPago: "",
        identificadorExterno: "",
        metaOrigem: { interpretacaoSegura: true, responsavel: "Fulano" },
      },
    },
  ];
  const { linhas } = aplicarMotorValidacaoImportacao(parseadas, {
    modulo: "debitos",
    matriz: [["Unidade", "Condomínio", "Referência", "Vencimento", "Valor", "Extra"], ["101", "Alpha", "09/2026", "2026-09-19", "100,00", "x"]],
    contexto,
  });
  assert.equal(linhas[0].validacao?.resultado, "atencao");
  assert.ok(linhas[0].payload, "atenção preserva payload para conferência");
  assert.equal(linhas[0].validacao?.inconsistencias.every((item) => item.severidade !== "erro"), true);
});

test("validação financeira bloqueia negativo e sinaliza soma divergente como atenção", () => {
  const contexto: ContextoImportacaoDebitos = {
    condominios: [{ id: 1, nome: "Alpha", identificadorExterno: "", status: "Ativo" }],
    unidades: [{ id: 10, condominioId: 1, identificacao: "101", bloco: "", status: "Ativa" }],
    debitos: [],
    debitosMutaveis: [],
    idsCondominioEscopo: new Set([1]),
    unidadeIdsComDebitoImportado: new Set(),
  };
  const base = {
    condominioId: 1,
    unidadeId: 10,
    referencia: "09/2026",
    descricao: "Taxa",
    dataVencimento: "2026-09-19",
    valor: "100.00",
    valorOriginal: "100.00",
    multa: "0.00",
    juros: "0.00",
    correcao: "0.00",
    status: "Vencido",
    dataPagamento: "",
    valorPago: "",
    identificadorExterno: "",
    metaOrigem: { interpretacaoSegura: true, responsavel: "Fulano" },
  };
  const matrizDebito = [
    ["Unidade", "Condomínio", "Referência", "Vencimento", "Valor"],
    ["101", "Alpha", "09/2026", "2026-09-19", "100,00"],
  ];
  const { linhas: negativas } = aplicarMotorValidacaoImportacao(
    [{ linha: 2, payload: { ...base, valorAtualizado: "-10.00" } }],
    { modulo: "debitos", matriz: matrizDebito, contexto },
  );
  assert.equal(negativas[0].validacao?.resultado, "erro");
  assert.ok(negativas[0].validacao?.inconsistencias.some((item) => item.codigo === "financeira.valor_negativo"));
  assert.equal(negativas[0].payload, undefined);

  const { linhas: divergentes } = aplicarMotorValidacaoImportacao(
    [{ linha: 2, payload: { ...base, valorAtualizado: "150.00" } }],
    { modulo: "debitos", matriz: matrizDebito, contexto },
  );
  assert.equal(divergentes[0].validacao?.resultado, "atencao");
  assert.ok(divergentes[0].validacao?.inconsistencias.some((item) => item.codigo === "financeira.soma_divergente"));
  assert.ok(divergentes[0].payload);
});

test("validação relacional e de negócio: unidade inexistente e unidade inativa", () => {
  const contexto: ContextoImportacaoDebitos = {
    condominios: [{ id: 1, nome: "Alpha", identificadorExterno: "", status: "Ativo" }],
    unidades: [{ id: 10, condominioId: 1, identificacao: "101", bloco: "", status: "Inativa", situacao: "Sem cobrança" }],
    debitos: [],
    debitosMutaveis: [],
    idsCondominioEscopo: new Set([1]),
    unidadeIdsComDebitoImportado: new Set(),
  };
  const payload: DebitoImportRow = {
    condominioId: 1,
    unidadeId: 99,
    referencia: "09/2026",
    descricao: "Taxa",
    dataVencimento: "2026-09-19",
    valor: "100.00",
    valorOriginal: "100.00",
    multa: "0.00",
    juros: "0.00",
    correcao: "0.00",
    valorAtualizado: "100.00",
    status: "Vencido",
    dataPagamento: "",
    valorPago: "",
    identificadorExterno: "",
    metaOrigem: { interpretacaoSegura: true, responsavel: "Fulano" },
  };
  const { linhas: semUnidade } = aplicarMotorValidacaoImportacao([{ linha: 2, payload }], {
    modulo: "debitos",
    matriz: [["Unidade"], ["x"]],
    contexto,
  });
  assert.equal(semUnidade[0].validacao?.resultado, "erro");
  assert.ok(semUnidade[0].validacao?.inconsistencias.some((item) => item.codigo === "relacional.unidade_inexistente"));

  const { linhas: inativa } = aplicarMotorValidacaoImportacao(
    [{ linha: 2, payload: { ...payload, unidadeId: 10 } }],
    { modulo: "debitos", matriz: [["Unidade"], ["101"]], contexto },
  );
  assert.equal(inativa[0].validacao?.resultado, "erro");
  assert.ok(inativa[0].validacao?.inconsistencias.some((item) => item.codigo === "negocio.estado_incompativel"));
});

test("motor não altera cadastros de negócio", () => {
  const antes = JSON.stringify(getCadastros().debitos);
  aplicarMotorValidacaoImportacao(
    [
      {
        linha: 2,
        payload: {
          condominioId: 1,
          unidadeId: 10,
          referencia: "09/2026",
          descricao: "Taxa",
          dataVencimento: "2026-09-19",
          valor: "1.00",
          valorOriginal: "1.00",
          multa: "0.00",
          juros: "0.00",
          correcao: "0.00",
          valorAtualizado: "1.00",
          status: "Vencido",
          dataPagamento: "",
          valorPago: "",
          identificadorExterno: "",
        },
      },
    ],
    {
      modulo: "debitos",
      matriz: [["Unidade"], ["101"]],
      contexto: { condominios: [], unidades: [], debitos: [], debitosMutaveis: [], idsCondominioEscopo: new Set(), unidadeIdsComDebitoImportado: new Set() },
    },
  );
  assert.equal(JSON.stringify(getCadastros().debitos), antes);
});

test("erros bloqueantes removem payload da linha", () => {
  const contexto: ContextoImportacaoDebitos = {
    condominios: [],
    unidades: [],
    debitos: [],
    debitosMutaveis: [],
    idsCondominioEscopo: new Set([1]),
    unidadeIdsComDebitoImportado: new Set(),
  };

  const parseadas: LinhaParseada<DebitoImportRow>[] = [
    { linha: 3, erro: "Unidade não encontrada." },
  ];

  const { linhas } = aplicarMotorValidacaoImportacao(parseadas, {
    modulo: "debitos",
    matriz: [["Unidade"], ["x"]],
    contexto,
  });

  assert.equal(linhas[0].erro?.includes("Unidade não encontrada"), true);
  assert.equal(linhas[0].payload, undefined);
  assert.equal(linhas[0].validacao?.resultado, "erro");
});
