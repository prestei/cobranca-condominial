import assert from "node:assert/strict";
import test from "node:test";
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

  const { linhas, registros } = aplicarMotorValidacaoImportacao(parseadas, {
    modulo: validadorImportacaoDebitos.modulo,
    matriz,
    contexto,
  });

  assert.equal(linhas.length, 1);
  assert.ok(linhas[0].validacao);
  assert.equal(linhas[0].validacao?.resultado, "atencao");
  assert.ok(
    linhas[0].validacao?.inconsistencias.some((item) => item.codigo === "estrutural.coluna_desconhecida"),
  );
  assert.equal(registros.length, 1);
  assert.equal(registros[0].identificador, "debitos:linha:2");
});

test("erros bloqueantes removem payload da linha", () => {
  const contexto: ContextoImportacaoDebitos = {
    condominios: [],
    unidades: [],
    debitos: [],
    debitosMutaveis: [],
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
