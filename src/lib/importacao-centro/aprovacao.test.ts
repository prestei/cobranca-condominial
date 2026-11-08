import assert from "node:assert/strict";
import test from "node:test";
import { hashConteudoArquivo } from "@/lib/importacoes/hash-arquivo";
import { validarAprovacao } from "@/lib/importacao-centro/aprovacao";
import { montarResumoAprovacaoImportacao } from "@/lib/importacao-centro/resumo-aprovacao";
import { previewImportacaoCentral } from "@/lib/importacao-centro/servico-central";
import { ImportacaoCentroError } from "@/lib/importacao-centro/types";
import type { AdaptadorImportacao, LinhaParseada } from "@/lib/importacao-centro/types";

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

test("validarAprovacao exige hash igual ao da prévia e confirmação explícita", async () => {
  const conteudo = "Codigo;Valor\nA;1\n";
  const hash = hashConteudoArquivo(conteudo);
  const { preview } = await previewImportacaoCentral(adaptadorTeste, 1, {
    origem: "Teste",
    arquivo: "a.csv",
    conteudo,
  });

  assert.throws(
    () => validarAprovacao(preview, { origem: "Teste", arquivo: "a.csv", conteudo, hashArquivo: hash }, "teste"),
    (err: unknown) => err instanceof ImportacaoCentroError && err.status === 400,
  );

  const resumo = validarAprovacao(
    preview,
    { origem: "Teste", arquivo: "a.csv", conteudo, hashArquivo: hash, confirmacaoExplicita: true },
    "teste",
  );
  assert.equal(resumo.seraoGravados >= 1, true);

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

test("montarResumoAprovacaoImportacao bloqueia quando nada será gravado", async () => {
  const conteudo = "Codigo;Valor\nA;1\n";
  const { preview } = await previewImportacaoCentral(adaptadorTeste, 1, {
    origem: "Teste",
    arquivo: "a.csv",
    conteudo,
  });

  const resumo = montarResumoAprovacaoImportacao({
    moduloDestino: "teste",
    preview: {
      ...preview,
      contadores: { ...preview.contadores, novos: 0, atualizacoes: 0 },
      linhas: preview.linhas.map((item) =>
        item.situacao === "novo" ? { ...item, situacao: "erro" as const, mensagem: "falha" } : item,
      ),
    },
  });

  assert.equal(resumo.podeConfirmar, false);
  assert.ok(resumo.motivoBloqueio);
});
