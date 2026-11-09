import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  getCadastros,
  resetCadastrosParaTestes,
  setCondominios,
  setResponsaveis,
  setUnidades,
  setVinculos,
} from "@/data/catalogo";
import { adaptadorImportacaoDebitos } from "@/lib/importacao-centro/adaptadores/debitos";
import { processarArquivoImportacao } from "@/lib/importacao-centro/processamento";
import { provisionarCadastrosImportacaoDebitos } from "@/lib/importacoes/inadimplencia/provisionar-cadastros-debitos";
import { interpretarPdfInadimplencia } from "@/lib/importacoes/inadimplencia/pdf-para-matriz-inadimplencia";

const MATRIZ = [
  [
    "Condomínio",
    "Unidade",
    "Responsável",
    "Referência",
    "Vencimento",
    "Valor atualizado",
  ],
  ["Condomínio Novo Import", "A-101", "Maria Silva", "09/2026", "05/09/2026", "R$ 100,00"],
  ["Condomínio Novo Import", "A-102", "João Souza", "09/2026", "06/09/2026", "R$ 200,00"],
];

test("provisionarCadastrosImportacaoDebitos cria condomínio, unidades e responsáveis ausentes", () => {
  resetCadastrosParaTestes();
  setCondominios(getCadastros().condominios.filter((item) => item.nome !== "Condomínio Novo Import"));
  setUnidades(getCadastros().unidades.filter((item) => item.identificacao !== "A-101" && item.identificacao !== "A-102"));

  const antesCondominios = getCadastros().condominios.length;
  const { condominiosCriados, unidadesCriadas, responsaveisCriados, vinculosCriados } =
    provisionarCadastrosImportacaoDebitos(MATRIZ, 1, "PDF");

  assert.equal(condominiosCriados.length, 1);
  assert.equal(condominiosCriados[0]?.nome, "Condomínio Novo Import");
  assert.equal(unidadesCriadas.length, 2);
  assert.equal(responsaveisCriados.length, 2);
  assert.equal(vinculosCriados.length, 2);
  assert.equal(getCadastros().condominios.length, antesCondominios + 1);
  assert.ok(getCadastros().unidades.some((item) => item.identificacao === "A-101"));
  assert.equal(getCadastros().unidades.find((item) => item.identificacao === "A-101")?.situacao, "Em cobrança");
  assert.ok(getCadastros().responsaveis.some((item) => item.nome === "Maria Silva"));
  assert.ok(
    getCadastros().vinculos.some((item) => {
      const unidade = getCadastros().unidades.find((u) => u.id === item.unidadeId);
      return unidade?.identificacao === "A-101" && item.principal;
    }),
  );
});

test("provisionamento idempotente não duplica condomínio, unidade, responsável nem vínculo", () => {
  resetCadastrosParaTestes();
  setCondominios([]);
  setUnidades([]);
  setResponsaveis([]);
  setVinculos([]);

  const primeira = provisionarCadastrosImportacaoDebitos(MATRIZ, 1, "PDF");
  const segunda = provisionarCadastrosImportacaoDebitos(MATRIZ, 1, "PDF");

  assert.equal(primeira.condominiosCriados.length, 1);
  assert.equal(primeira.unidadesCriadas.length, 2);
  assert.equal(primeira.responsaveisCriados.length, 2);
  assert.equal(primeira.vinculosCriados.length, 2);
  assert.equal(segunda.condominiosCriados.length, 0);
  assert.equal(segunda.unidadesCriadas.length, 0);
  assert.equal(segunda.responsaveisCriados.length, 0);
  assert.equal(segunda.vinculosCriados.length, 0);
  assert.equal(getCadastros().condominios.length, 1);
  assert.equal(getCadastros().unidades.length, 2);
  assert.equal(getCadastros().responsaveis.length, 2);
  assert.equal(getCadastros().vinculos.length, 2);
});

test("provisionamento reutiliza responsável e vínculo já existentes sem sobrescrever", () => {
  resetCadastrosParaTestes();
  setCondominios([]);
  setUnidades([]);
  setResponsaveis([
    {
      id: 99,
      nome: "Maria Silva",
      cpfCnpj: "123.456.789-09",
      tipoPessoa: "Fisica",
      telefone: "71999999999",
      whatsapp: "",
      email: "maria@exemplo.com",
      endereco: "Rua A",
      observacoes: "cadastro manual",
    },
  ]);
  setVinculos([]);

  const resultado = provisionarCadastrosImportacaoDebitos(MATRIZ, 1, "PDF");
  assert.equal(resultado.responsaveisCriados.filter((item) => item.nome === "Maria Silva").length, 0);
  const maria = getCadastros().responsaveis.find((item) => item.id === 99);
  assert.ok(maria);
  assert.equal(maria.cpfCnpj, "123.456.789-09");
  assert.equal(maria.email, "maria@exemplo.com");
  assert.equal(maria.observacoes, "cadastro manual");
});

test("prévia de inadimplência com PDF cria condomínio, unidades e responsáveis sem cadastro prévio", async () => {
  resetCadastrosParaTestes();
  setCondominios([]);
  setUnidades([]);
  setResponsaveis([]);
  setVinculos([]);

  const buffer = readFileSync("src/test/fixtures/relatorio-inadimplencia-daniel-jorge-advocacia.pdf");
  const relatorio = await interpretarPdfInadimplencia(buffer);
  assert.ok(relatorio);

  const processado = processarArquivoImportacao(adaptadorImportacaoDebitos, {
    modo: "preview",
    userId: 1,
    origem: "PDF",
    arquivo: "daniel-jorge.pdf",
    hashArquivo: "teste-provisionamento-pdf",
    conteudo: "",
    matrizPlanilha: relatorio.matriz,
    metadadosRelatorio: { tipo: relatorio.formato, inconsistencias: relatorio.inconsistencias ?? [] },
  });

  assert.ok(getCadastros().condominios.some((item) => item.nome === "Residencial do Mar"));
  assert.ok(getCadastros().unidades.length >= 1);
  assert.ok(getCadastros().responsaveis.some((item) => item.nome === "Gleide Nunes Rocha"));
  assert.ok(getCadastros().vinculos.length >= 1);
  assert.equal(processado.linhasInternas.filter((item) => item.situacao === "erro").length, 0);
  assert.ok(processado.linhasInternas.some((item) => item.situacao === "novo"));
  assert.ok(
    processado.linhasInternas.every((item) => Boolean(item.resumo?.unidade?.trim()) && item.resumo?.unidade !== "—"),
  );
  assert.ok(processado.linhasInternas.some((item) => item.resumo?.unidade === "MB-0102"));
});

test("prévia Solar das Palmeiras provisiona condomínio, unidades, responsáveis e valores", async () => {
  resetCadastrosParaTestes();
  setCondominios([]);
  setUnidades([]);
  setResponsaveis([]);
  setVinculos([]);

  const buffer = readFileSync("src/test/fixtures/relatorio-inadimplencia-solar-das-palmeiras.pdf");
  const relatorio = await interpretarPdfInadimplencia(buffer);
  assert.ok(relatorio);
  assert.equal(relatorio.condominioNome, "Edifício Solar das Palmeiras");
  assert.equal(relatorio.linhas.length, 8);
  assert.ok(!relatorio.inconsistencias.some((item) => item.codigo === "financeira.total_geral_divergente"));

  const processado = processarArquivoImportacao(adaptadorImportacaoDebitos, {
    modo: "preview",
    userId: 1,
    origem: "PDF",
    arquivo: "solar-palmeiras.pdf",
    hashArquivo: "teste-provisionamento-solar",
    conteudo: "",
    matrizPlanilha: relatorio.matriz,
    metadadosRelatorio: { tipo: relatorio.formato, inconsistencias: relatorio.inconsistencias ?? [] },
  });

  assert.ok(getCadastros().condominios.some((item) => item.nome === "Edifício Solar das Palmeiras"));
  assert.equal(getCadastros().unidades.filter((u) => ["A-0104", "A-0302", "B-0501"].includes(u.identificacao)).length, 3);
  assert.ok(getCadastros().responsaveis.some((item) => item.nome.includes("Rodrigo Fernandes")));
  assert.ok(getCadastros().responsaveis.some((item) => item.nome.includes("Juliana Martins")));
  assert.equal(processado.linhasInternas.filter((item) => item.situacao === "erro").length, 0);
  assert.equal(processado.linhasInternas.length, 8);
  const primeira = processado.linhasInternas[0];
  assert.equal(primeira?.resumo?.responsavel?.includes("Rodrigo") || primeira?.resumo?.total === "1473.95", true);
  assert.deepEqual(
    [...new Set(processado.linhasInternas.map((item) => item.resumo?.unidade))].sort(),
    ["A-0104", "A-0302", "B-0501"],
  );
});

test("prévia Residencial do Mar (PDF completo) exibe códigos de unidade no resumo", async () => {
  resetCadastrosParaTestes();
  setCondominios([]);
  setUnidades([]);
  setResponsaveis([]);
  setVinculos([]);

  const buffer = readFileSync("src/test/fixtures/relatorio-inadimplencia-residencial-do-mar.pdf");
  const relatorio = await interpretarPdfInadimplencia(buffer);
  assert.ok(relatorio);
  assert.ok(relatorio.linhas.length >= 100);

  const processado = processarArquivoImportacao(adaptadorImportacaoDebitos, {
    modo: "preview",
    userId: 1,
    origem: "PDF",
    arquivo: "residencial-do-mar.pdf",
    hashArquivo: "teste-resumo-unidade-mar",
    conteudo: "",
    matrizPlanilha: relatorio.matriz,
    metadadosRelatorio: { tipo: relatorio.formato, inconsistencias: relatorio.inconsistencias ?? [] },
  });

  assert.equal(processado.linhasInternas.filter((item) => !item.resumo?.unidade || item.resumo.unidade === "—").length, 0);
  assert.ok(processado.linhasInternas.some((item) => item.resumo?.unidade === "MB-0102"));
  assert.ok(processado.linhasInternas.some((item) => item.resumo?.unidade === "ME-0103"));
});
