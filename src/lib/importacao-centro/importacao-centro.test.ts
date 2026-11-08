import assert from "node:assert/strict";
import test from "node:test";
import { hashConteudoArquivo } from "@/lib/importacoes/hash-arquivo";
import { marcarDuplicidadesNoArquivo, contarPorSituacao } from "@/lib/importacao-centro/duplicidades";
import { pipelineConferencia } from "@/lib/importacao-centro/conferencia";
import { lerArquivoImportacao } from "@/lib/importacao-centro/leitura-arquivo";
import { validarAprovacao } from "@/lib/importacao-centro/aprovacao";
import { ImportacaoCentroError } from "@/lib/importacao-centro/types";
import type { AdaptadorImportacao, LinhaParseada } from "@/lib/importacao-centro/types";
import { confirmarImportacaoCentral, previewImportacaoCentral } from "@/lib/importacao-centro/servico-central";
import { getCadastros, resetCadastrosParaTestes } from "@/data/catalogo";

type ItemTeste = { codigo: string; valor: number };

const adaptadorTeste: AdaptadorImportacao<ItemTeste, { vistos: Set<string> }> = {
  modulo: "teste",
  tipoImportacao: "debitos",
  formato: "teste-v1",

  prepararContexto() {
    return { vistos: new Set<string>() };
  },

  interpretarMatriz(matriz) {
    const resultado: LinhaParseada<ItemTeste>[] = [];
    for (let i = 1; i < matriz.length; i += 1) {
      const codigo = matriz[i][0]?.trim() ?? "";
      const valorRaw = matriz[i][1]?.trim() ?? "";
      if (!codigo && !valorRaw) continue;
      if (!codigo) {
        resultado.push({ linha: i + 1, erro: "Código obrigatório." });
        continue;
      }
      const valor = Number(valorRaw);
      if (!Number.isFinite(valor)) {
        resultado.push({ linha: i + 1, erro: "Valor inválido." });
        continue;
      }
      resultado.push({ linha: i + 1, payload: { codigo, valor } });
    }
    return resultado;
  },

  validarOrigem(origem) {
    return origem.trim() ? null : "Origem obrigatória.";
  },

  chaveDuplicidadeNoArquivo(payload) {
    return payload.codigo.toLowerCase();
  },

  classificarContraBase(payload, contexto) {
    if (contexto.vistos.has(payload.codigo)) {
      return { situacao: "duplicado", mensagem: "Já existe na base simulada." };
    }
    contexto.vistos.add(payload.codigo);
    return { situacao: "novo" };
  },

  arquivoJaImportado: () => false,
  buscarImportacaoIdempotente: () => undefined,

  persistirLinha() {
    return "novo";
  },
  finalizarPersistencia() {},
  montarRegistroImportacao() {
    throw new Error("não usado no teste de prévia");
  },
  registrarAuditoriaConfirmacao() {},
};

test("lerArquivoImportacao interpreta CSV com separador ;", () => {
  const matriz = lerArquivoImportacao("Codigo;Valor\nA;10\nB;20\n");
  assert.equal(matriz.length, 3);
  assert.deepEqual(matriz[0], ["Codigo", "Valor"]);
});

test("marcarDuplicidadesNoArquivo detecta linhas repetidas no arquivo", () => {
  const linhas = marcarDuplicidadesNoArquivo(
    [
      { linha: 2, payload: { codigo: "X", valor: 1 } },
      { linha: 3, payload: { codigo: "X", valor: 2 } },
      { linha: 4, erro: "falha" },
    ],
    (p) => p.codigo,
  );
  assert.equal(linhas.filter((item) => item.situacao === "duplicado").length, 1);
  assert.equal(linhas.filter((item) => item.situacao === "erro").length, 1);
});

test("pipelineConferencia não persiste e classifica novos vs duplicados na base", () => {
  const parseadas: LinhaParseada<ItemTeste>[] = [
    { linha: 2, payload: { codigo: "A", valor: 1 } },
    { linha: 3, payload: { codigo: "A", valor: 2 } },
    { linha: 4, payload: { codigo: "B", valor: 3 } },
  ];
  const contexto = adaptadorTeste.prepararContexto(1);
  const linhas = pipelineConferencia(parseadas, adaptadorTeste, contexto);
  const contagem = contarPorSituacao(linhas);
  assert.equal(contagem.duplicado, 1, "segunda linha com mesmo código no arquivo");
  assert.equal(contagem.novo, 2, "primeira ocorrência e código distinto");
});

test("previewImportacaoCentral rejeita conteúdo vazio", async () => {
  await assert.rejects(
    () =>
      previewImportacaoCentral(adaptadorTeste, 1, {
        origem: "Teste",
        arquivo: "a.csv",
        conteudo: "   ",
      }),
    (err: unknown) => err instanceof ImportacaoCentroError && err.status === 400,
  );
});

test("validarAprovacao exige hash igual ao da prévia", async () => {
  const conteudo = "Codigo;Valor\nA;1\n";
  const hash = hashConteudoArquivo(conteudo);
  const { preview } = await previewImportacaoCentral(adaptadorTeste, 1, {
    origem: "Teste",
    arquivo: "a.csv",
    conteudo,
  });

  assert.doesNotThrow(() =>
    validarAprovacao(
      preview,
      { origem: "Teste", arquivo: "a.csv", conteudo, hashArquivo: hash, confirmacaoExplicita: true },
      "teste",
    ),
  );

  assert.throws(
    () =>
      validarAprovacao(
        preview,
        { origem: "Teste", arquivo: "a.csv", conteudo, hashArquivo: "outro", confirmacaoExplicita: true },
        "teste",
      ),
    (err: unknown) => err instanceof ImportacaoCentroError && err.status === 409,
  );
});

test("confirmarImportacaoCentral é idempotente e não duplica registros graváveis", async () => {
  resetCadastrosParaTestes();
  const gravados: string[] = [];
  const adaptadorGravacao: AdaptadorImportacao<ItemTeste, { vistos: Set<string> }> = {
    ...adaptadorTeste,
    prepararContexto() {
      return { vistos: new Set<string>() };
    },
    classificarContraBase(payload, contexto) {
      if (contexto.vistos.has(payload.codigo)) {
        return { situacao: "duplicado", mensagem: "Já na base." };
      }
      contexto.vistos.add(payload.codigo);
      return { situacao: "novo" };
    },
    persistirLinha(payload) {
      gravados.push(payload.codigo);
      return "novo";
    },
    finalizarPersistencia() {},
    montarRegistroImportacao(input) {
      return {
        id: getCadastros().importacoes.length + 1,
        origem: input.origem,
        tipo: "debitos",
        arquivo: input.arquivo,
        status: "Concluida",
        quantidadeRegistros: String(input.quantidadeRegistros),
        quantidadeImportados: String(input.contadores.novos),
        quantidadeAtualizados: "0",
        quantidadeErros: "0",
        observacaoInterna: JSON.stringify({ hashArquivo: input.hashArquivo }),
        usuarioId: input.userId,
        dataImportacao: new Date().toISOString(),
      };
    },
    arquivoJaImportado(hash) {
      return getCadastros().importacoes.some((item) => item.observacaoInterna.includes(hash));
    },
    buscarImportacaoIdempotente(hash) {
      return getCadastros().importacoes.find((item) => item.observacaoInterna.includes(hash));
    },
  };

  const conteudo = "Codigo;Valor\nN1;1\n";
  const hash = hashConteudoArquivo(conteudo);
  const entrada = {
    origem: "Teste",
    arquivo: "a.csv",
    conteudo,
    hashArquivo: hash,
    confirmacaoExplicita: true as const,
  };

  const primeiro = await confirmarImportacaoCentral(adaptadorGravacao, 1, entrada);
  assert.equal(primeiro.idempotente, false);
  assert.equal(gravados.length, 1);

  const segundo = await confirmarImportacaoCentral(adaptadorGravacao, 1, entrada);
  assert.equal(segundo.idempotente, true);
  assert.equal(gravados.length, 1, "segunda confirmação não deve gravar de novo");
});
