import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { hashConteudoArquivo } from "@/lib/importacoes/hash-arquivo";
import { getCadastros, resetCadastrosParaTestes } from "@/data/catalogo";
import { ImportacaoCentroError } from "@/lib/importacao-centro/types";
import {
  confirmarImportacaoCentral,
  previewImportacaoCentral,
  previewImportacaoPorModulo,
} from "@/lib/importacao-centro/servico-central";
import {
  listarModulosAdaptadorImportacao,
  MODULOS_IMPORTACAO_CENTRAL,
  obterAdaptadorImportacao,
  registrarAdaptadorImportacao,
} from "@/lib/importacao-centro/registro-adaptadores";
import { politicaAprovacaoModuloImportacao } from "@/lib/importacao-centro/politica-aprovacao";
import type { AdaptadorImportacao, LinhaParseada } from "@/lib/importacao-centro/types";
import { criarServicoImportacaoModulo } from "@/lib/importacoes/preview-importacao-modulo";

const DIR_CENTRO = dirname(fileURLToPath(import.meta.url));

type ItemTeste = { codigo: string };

function criarAdaptadorCaptura(chamadas: string[]): AdaptadorImportacao<ItemTeste, { vistos: Set<string> }> {
  return {
    modulo: `teste-arquitetura-${chamadas.length}-${Math.random().toString(16).slice(2)}`,
    tipoImportacao: "debitos",
    formato: "teste-arquitetura-v1",
    politicaAprovacao: { permitirImportacaoParcial: true, suportaTotalFinanceiro: false },
    prepararContexto() {
      chamadas.push("prepararContexto");
      return { vistos: new Set<string>() };
    },
    interpretarMatriz(matriz) {
      chamadas.push("interpretarMatriz");
      const resultado: LinhaParseada<ItemTeste>[] = [];
      for (let i = 1; i < matriz.length; i += 1) {
        const codigo = matriz[i][0]?.trim() ?? "";
        if (!codigo) continue;
        resultado.push({ linha: i + 1, payload: { codigo } });
      }
      return resultado;
    },
    validarOrigem(origem) {
      return origem.trim() ? null : "Origem obrigatória.";
    },
    chaveDuplicidadeNoArquivo(payload) {
      return payload.codigo;
    },
    classificarContraBase() {
      chamadas.push("classificarContraBase");
      return { situacao: "novo" };
    },
    arquivoJaImportado: () => false,
    buscarImportacaoIdempotente: () => undefined,
    persistirLinha(payload) {
      chamadas.push(`persistirLinha:${payload.codigo}`);
      return "novo";
    },
    finalizarPersistencia() {
      chamadas.push("finalizarPersistencia");
    },
    montarRegistroImportacao(input) {
      chamadas.push("montarRegistroImportacao");
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
    registrarAuditoriaConfirmacao() {
      chamadas.push("registrarAuditoriaConfirmacao");
    },
  };
}

test("registro central expõe adaptador próprio para cada módulo de importação", () => {
  const modulos = listarModulosAdaptadorImportacao();
  assert.deepEqual(modulos, [...MODULOS_IMPORTACAO_CENTRAL]);
  for (const modulo of modulos) {
    const adapter = obterAdaptadorImportacao(modulo);
    assert.equal(adapter.modulo, modulo);
    assert.ok(adapter.politicaAprovacao, `adaptador ${modulo} deve declarar política de aprovação`);
    assert.deepEqual(politicaAprovacaoModuloImportacao(modulo), adapter.politicaAprovacao);
  }
});

test("prévia usa o pipeline central sem persistir linhas", async () => {
  resetCadastrosParaTestes();
  const chamadas: string[] = [];
  const adapter = criarAdaptadorCaptura(chamadas);
  const conteudo = "Codigo\nA1\n";
  const { preview } = await previewImportacaoCentral(adapter, 1, {
    origem: "Teste",
    arquivo: "a.csv",
    conteudo,
  });
  assert.equal(preview.contadores.novos, 1);
  assert.equal(chamadas.includes("interpretarMatriz"), true);
  assert.equal(chamadas.includes("classificarContraBase"), true);
  assert.equal(
    chamadas.some((item) => item.startsWith("persistirLinha")),
    false,
    "leitura/prévia não pode gravar",
  );
  assert.equal(chamadas.includes("finalizarPersistencia"), false);
});

test("novo módulo entra só com adaptador registrado, sem alterar o orquestrador", async () => {
  resetCadastrosParaTestes();
  const chamadas: string[] = [];
  const adapter = criarAdaptadorCaptura(chamadas);
  registrarAdaptadorImportacao(adapter);
  assert.equal(obterAdaptadorImportacao(adapter.modulo).modulo, adapter.modulo);

  const conteudo = "Codigo\nNovoModulo\n";
  const hash = hashConteudoArquivo(conteudo);
  await previewImportacaoCentral(adapter, 1, { origem: "Teste", arquivo: "n.csv", conteudo });
  const resultado = await confirmarImportacaoCentral(adapter, 1, {
    origem: "Teste",
    arquivo: "n.csv",
    conteudo,
    hashArquivo: hash,
    confirmacaoExplicita: true,
  });
  assert.equal(resultado.idempotente, false);
  assert.equal(chamadas.includes("persistirLinha:NovoModulo"), true);
  assert.equal(chamadas.includes("finalizarPersistencia"), true);
});

test("módulo sem adaptador registrado não entra no pipeline", async () => {
  await assert.rejects(
    () => previewImportacaoPorModulo("colaboradores", 1, { origem: "Teste", conteudo: "A\n1" }),
    (err: unknown) => err instanceof ImportacaoCentroError && err.status === 400,
  );
});

test("fachada por módulo usa o centro e não grava débitos na prévia", async () => {
  resetCadastrosParaTestes();
  const debitosAntes = getCadastros().debitos.length;
  const servico = criarServicoImportacaoModulo("debitos");
  const preview = await servico.preview(1, {
    origem: "Outra administradora",
    arquivo: "d.csv",
    conteudo: [
      "Unidade;Bloco;Condomínio;Referência;Vencimento;Valor",
      "102;A;Condomínio Teste 1;09/2026;2026-09-15;350,00",
    ].join("\n"),
  });
  assert.ok(preview.quantidadeRegistros >= 1);
  assert.equal(getCadastros().debitos.length, debitosAntes);
});

test("serviços centrais do pipeline não ramificam por nome de módulo", () => {
  const arquivos = [
    "servico-central.ts",
    "processamento.ts",
    "leitura-arquivo.ts",
    "validacao.ts",
    "duplicidades.ts",
    "conferencia.ts",
    "aprovacao.ts",
    "persistencia.ts",
    "confirmacao.ts",
  ];
  const ramificacao = /modulo\s*===\s*["'](?:debitos|condominios|unidades|responsaveis)["']/;
  for (const arquivo of arquivos) {
    const fonte = readFileSync(join(DIR_CENTRO, arquivo), "utf8");
    assert.equal(ramificacao.test(fonte), false, `${arquivo} não deve ramificar por módulo`);
  }
});

test("gravação de linha importada só ocorre no serviço de persistência", () => {
  const pipeline = [
    "servico-central.ts",
    "processamento.ts",
    "leitura-arquivo.ts",
    "validacao.ts",
    "duplicidades.ts",
    "conferencia.ts",
    "aprovacao.ts",
    "confirmacao.ts",
  ];
  for (const arquivo of pipeline) {
    const fonte = readFileSync(join(DIR_CENTRO, arquivo), "utf8");
    assert.equal(
      /\.persistirLinha\s*\(/.test(fonte),
      false,
      `${arquivo} não pode chamar persistirLinha`,
    );
  }
  const persistencia = readFileSync(join(DIR_CENTRO, "persistencia.ts"), "utf8");
  assert.equal(/adapter\.persistirLinha\s*\(/.test(persistencia), true);
});
