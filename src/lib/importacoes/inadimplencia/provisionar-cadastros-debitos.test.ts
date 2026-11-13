import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getCadastros, resetCadastrosParaTestes, setAtribuicoesCobranca, setCondominios, setDebitos, setResponsaveis, setUnidades, setVinculos } from "@/data/catalogo-store";
import { adaptadorImportacaoDebitos } from "@/lib/importacao-centro/adaptadores/debitos";
import { processarArquivoImportacao } from "@/lib/importacao-centro/processamento";
import {
  atualizarConfigDistribuicaoAutomatica,
  obterConfigDistribuicaoAutomatica,
} from "@/lib/distribuicao/service";
import {
  provisionarCadastrosImportacaoDebitos,
  resolverEnderecoPadraoCondominioProvisionamento,
} from "@/lib/importacoes/inadimplencia/provisionar-cadastros-debitos";
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

test("provisionamento replica cidade predominante da carteira no condomínio IMPORT", async () => {
  resetCadastrosParaTestes();
  setCondominios([
    {
      id: 1,
      nome: "Condomínio Solar das Palmeiras",
      identificadorExterno: "COND-0001",
      status: "Ativo",
      advogados: ["Dra. Thamires"],
      administradora: "Carteira",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      cidade: "Feira de Santana",
      estado: "BA",
      observacao: "",
      delinquencyTrackingDays: null,
    },
    {
      id: 2,
      nome: "Residencial Parque das Flores",
      identificadorExterno: "COND-0002",
      status: "Ativo",
      advogados: ["Dra. Thamires"],
      administradora: "Carteira",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      cidade: "Feira de Santana",
      estado: "BA",
      observacao: "",
      delinquencyTrackingDays: null,
    },
    {
      id: 99,
      nome: "Legado outra região",
      identificadorExterno: "LEG-01",
      status: "Ativo",
      advogados: ["Outro Advogado"],
      administradora: "X",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      cidade: "Salvador",
      estado: "BA",
      observacao: "",
      delinquencyTrackingDays: null,
    },
  ]);
  setUnidades([]);
  setResponsaveis([]);
  setVinculos([]);

  assert.deepEqual(resolverEnderecoPadraoCondominioProvisionamento(1), {
    cidade: "Feira de Santana",
    estado: "BA",
  });

  const matrizMar = [
    ["Condomínio", "Unidade", "Responsável", "Referência", "Vencimento", "Valor atualizado"],
    ["Residencial do Mar", "MB-0102", "Maria Silva", "09/2026", "05/09/2026", "R$ 100,00"],
  ];
  await provisionarCadastrosImportacaoDebitos(matrizMar, 1, "PDF");
  const mar = getCadastros().condominios.find((item) => item.nome === "Residencial do Mar");
  assert.equal(mar?.cidade, "Feira de Santana");
  assert.equal(mar?.estado, "BA");
});

test("provisionamento completa cidade em condomínio IMPORT existente sem município", async () => {
  resetCadastrosParaTestes();
  setCondominios([
    {
      id: 1,
      nome: "Condomínio Solar das Palmeiras",
      identificadorExterno: "COND-0001",
      status: "Ativo",
      advogados: ["Dra. Thamires"],
      administradora: "Carteira",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      cidade: "Feira de Santana",
      estado: "BA",
      observacao: "",
      delinquencyTrackingDays: null,
    },
    {
      id: 3,
      nome: "Residencial do Mar",
      identificadorExterno: "IMPORT-RESIDENCIAL-DO-MAR",
      status: "Ativo",
      advogados: ["Dra. Thamires"],
      administradora: "PDF",
      cep: "",
      logradouro: "",
      numero: "",
      complemento: "",
      cidade: "",
      estado: "",
      observacao: "Cadastro criado automaticamente na importação de inadimplência.",
      delinquencyTrackingDays: null,
    },
  ]);
  setUnidades([
    {
      id: 10,
      condominioId: 3,
      identificacao: "MB-0102",
      bloco: "MB",
      tipo: "Apartamento",
      status: "Ativa",
      situacao: "Sem cobrança",
    },
  ]);
  setResponsaveis([]);
  setVinculos([]);

  const matrizMar = [
    ["Condomínio", "Unidade", "Responsável", "Referência", "Vencimento", "Valor atualizado"],
    ["Residencial do Mar", "MB-0102", "Maria Silva", "09/2026", "05/09/2026", "R$ 100,00"],
  ];
  await provisionarCadastrosImportacaoDebitos(matrizMar, 1, "PDF");
  const mar = getCadastros().condominios.find((item) => item.id === 3);
  assert.equal(mar?.cidade, "Feira de Santana");
  assert.equal(mar?.estado, "BA");
});

test("provisionarCadastrosImportacaoDebitos cria condomínio, unidades e responsáveis ausentes", async () => {
  resetCadastrosParaTestes();
  setCondominios(getCadastros().condominios.filter((item) => item.nome !== "Condomínio Novo Import"));
  setUnidades(getCadastros().unidades.filter((item) => item.identificacao !== "A-101" && item.identificacao !== "A-102"));

  const antesCondominios = getCadastros().condominios.length;
  const { condominiosCriados, unidadesCriadas, responsaveisCriados, vinculosCriados } =
    await provisionarCadastrosImportacaoDebitos(MATRIZ, 1, "PDF");

  assert.equal(condominiosCriados.length, 1);
  assert.equal(condominiosCriados[0]?.nome, "Condomínio Novo Import");
  assert.equal(unidadesCriadas.length, 2);
  assert.equal(responsaveisCriados.length, 2);
  assert.equal(vinculosCriados.length, 2);
  assert.equal(getCadastros().condominios.length, antesCondominios + 1);
  assert.ok(getCadastros().unidades.some((item) => item.identificacao === "A-101"));
  assert.equal(getCadastros().unidades.find((item) => item.identificacao === "A-101")?.situacao, "Sem cobrança");
  assert.ok(getCadastros().responsaveis.some((item) => item.nome === "Maria Silva"));
  assert.ok(
    getCadastros().vinculos.some((item) => {
      const unidade = getCadastros().unidades.find((u) => u.id === item.unidadeId);
      return unidade?.identificacao === "A-101" && item.principal;
    }),
  );
});

test("provisionamento idempotente não duplica condomínio, unidade, responsável nem vínculo", async () => {
  resetCadastrosParaTestes();
  setCondominios([]);
  setUnidades([]);
  setResponsaveis([]);
  setVinculos([]);

  const primeira = await provisionarCadastrosImportacaoDebitos(MATRIZ, 1, "PDF");
  const segunda = await provisionarCadastrosImportacaoDebitos(MATRIZ, 1, "PDF");

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

test("provisionamento reutiliza responsável e vínculo já existentes sem sobrescrever", async () => {
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

  const resultado = await provisionarCadastrosImportacaoDebitos(MATRIZ, 1, "PDF");
  assert.equal(resultado.responsaveisCriados.filter((item) => item.nome === "Maria Silva").length, 0);
  const maria = getCadastros().responsaveis.find((item) => item.id === 99);
  assert.ok(maria);
  assert.equal(maria.cpfCnpj, "123.456.789-09");
  assert.equal(maria.email, "maria@exemplo.com");
  assert.equal(maria.observacoes, "cadastro manual");
});

test("atendente na prévia provisiona condomínio fora da carteira sem erro de escopo", async () => {
  resetCadastrosParaTestes();
  setCondominios([]);
  setUnidades([]);
  setResponsaveis([]);
  setVinculos([]);

  const ATENDENTE_ID = 2;
  const processado = await processarArquivoImportacao(adaptadorImportacaoDebitos, {
    modo: "preview",
    userId: ATENDENTE_ID,
    origem: "PDF",
    arquivo: "novo-condo-atendente.csv",
    hashArquivo: "teste-atendente-provisionamento",
    conteudo: "",
    matrizPlanilha: MATRIZ,
  });

  assert.ok(getCadastros().condominios.some((item) => item.nome === "Condomínio Novo Import"));
  assert.equal(processado.linhasInternas.filter((item) => item.situacao === "erro").length, 0);
  assert.ok(processado.linhasInternas.some((item) => item.situacao === "novo"));
  assert.equal(
    processado.linhasInternas.filter((item) => item.mensagem?.includes("fora do escopo")).length,
    0,
  );
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

  const processado = await processarArquivoImportacao(adaptadorImportacaoDebitos, {
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

test("prévia Residencial Grand Park (torres T1/T2) — linhas válidas após provisionamento", async () => {
  resetCadastrosParaTestes();
  setCondominios([]);
  setUnidades([]);
  setResponsaveis([]);
  setVinculos([]);

  const buffer = readFileSync("src/test/fixtures/relatorio-inadimplencia-residencial-grand-park.pdf");
  const relatorio = await interpretarPdfInadimplencia(buffer);
  assert.ok(relatorio);
  assert.equal(relatorio.linhas.length, 8);

  const processado = await processarArquivoImportacao(adaptadorImportacaoDebitos, {
    modo: "preview",
    userId: 1,
    origem: "PDF",
    arquivo: "grand-park.pdf",
    hashArquivo: "teste-grand-park-previa",
    conteudo: "",
    matrizPlanilha: relatorio.matriz,
    metadadosRelatorio: { tipo: relatorio.formato, inconsistencias: relatorio.inconsistencias ?? [] },
  });

  assert.ok(getCadastros().condominios.some((item) => item.nome === "Residencial Grand Park"));
  assert.equal(processado.linhasInternas.filter((item) => item.situacao === "erro").length, 0);
  assert.ok(processado.linhasInternas.every((item) => item.situacao === "novo" || item.situacao === "atualizacao"));
  assert.ok(processado.preview.resumoAprovacao?.podeConfirmar);
  assert.equal(processado.preview.resumoAprovacao?.seraoGravados, 8);
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

  const processado = await processarArquivoImportacao(adaptadorImportacaoDebitos, {
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

  const processado = await processarArquivoImportacao(adaptadorImportacaoDebitos, {
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
  assert.ok(
    getCadastros().unidades.every((item) => item.situacao === "Sem cobrança"),
    "prévia não deve colocar unidade em cobrança antes de gravar débitos",
  );
});

test("confirmação de débitos promove unidade Sem cobrança para Em cobrança", async () => {
  resetCadastrosParaTestes();
  setCondominios([]);
  setUnidades([]);
  setResponsaveis([]);
  setVinculos([]);
  setDebitos([]);
  setAtribuicoesCobranca([]);

  const buffer = readFileSync("src/test/fixtures/relatorio-inadimplencia-solar-das-palmeiras.pdf");
  const relatorio = await interpretarPdfInadimplencia(buffer);
  assert.ok(relatorio);

  const processado = await processarArquivoImportacao(adaptadorImportacaoDebitos, {
    modo: "preview",
    userId: 1,
    origem: "PDF",
    arquivo: "solar-confirm.pdf",
    hashArquivo: "teste-promocao-cobranca-solar",
    conteudo: "",
    matrizPlanilha: relatorio.matriz,
    metadadosRelatorio: { tipo: relatorio.formato, inconsistencias: relatorio.inconsistencias ?? [] },
  });

  assert.ok(getCadastros().unidades.every((item) => item.situacao === "Sem cobrança"));

  const contexto = {
    ...processado.contexto,
    unidadeIdsComDebitoImportado: new Set<number>(),
    debitosMutaveis: [...processado.contexto.debitosMutaveis],
  };
  for (const linha of processado.linhasInternas) {
    if (!linha.payload || linha.situacao !== "novo") continue;
    adaptadorImportacaoDebitos.persistirLinha(linha.payload, "novo", contexto, {
      origem: "PDF",
      arquivo: "solar-confirm.pdf",
      userId: 1,
    });
  }
  atualizarConfigDistribuicaoAutomatica(1, { ativada: true, estrategia: "carga" });
  adaptadorImportacaoDebitos.finalizarPersistencia(contexto, {
    userId: 1,
    origem: "PDF",
    arquivo: "solar-confirm.pdf",
  });

  const unidadesComDebito = new Set(getCadastros().debitos.map((item) => item.unidadeId));
  assert.ok(unidadesComDebito.size >= 3);
  for (const unidade of getCadastros().unidades) {
    if (!unidadesComDebito.has(unidade.id)) continue;
    assert.equal(unidade.situacao, "Em cobrança", unidade.identificacao);
  }
  assert.ok(getCadastros().debitos.every((item) => item.status === "Vencido"));

  assert.equal(obterConfigDistribuicaoAutomatica().ativada, true);
  const idsImportados = [...contexto.unidadeIdsComDebitoImportado];
  assert.ok(idsImportados.length >= 1);
  for (const unidadeId of idsImportados) {
    const vigente = getCadastros().atribuicoesCobranca.find(
      (item) => item.unidadeId === unidadeId && !item.encerradoEm,
    );
    assert.ok(vigente, `unidade ${unidadeId} deveria ter RE após distribuição automática`);
    assert.match(vigente.motivo, /Distribuição automática/);
  }
});

test("confirmação sem distribuição automática não atribui RE", async () => {
  resetCadastrosParaTestes();
  setCondominios([]);
  setUnidades([]);
  setResponsaveis([]);
  setVinculos([]);
  setDebitos([]);
  setAtribuicoesCobranca([]);
  atualizarConfigDistribuicaoAutomatica(1, { ativada: false, estrategia: "carga" });

  const buffer = readFileSync("src/test/fixtures/relatorio-inadimplencia-solar-das-palmeiras.pdf");
  const relatorio = await interpretarPdfInadimplencia(buffer);
  assert.ok(relatorio);

  const processado = await processarArquivoImportacao(adaptadorImportacaoDebitos, {
    modo: "preview",
    userId: 1,
    origem: "PDF",
    arquivo: "solar-sem-auto.pdf",
    hashArquivo: "teste-sem-distribuicao-auto",
    conteudo: "",
    matrizPlanilha: relatorio.matriz,
    metadadosRelatorio: { tipo: relatorio.formato, inconsistencias: relatorio.inconsistencias ?? [] },
  });

  const contexto = {
    ...processado.contexto,
    unidadeIdsComDebitoImportado: new Set<number>(),
    debitosMutaveis: [...processado.contexto.debitosMutaveis],
  };
  for (const linha of processado.linhasInternas) {
    if (!linha.payload || linha.situacao !== "novo") continue;
    adaptadorImportacaoDebitos.persistirLinha(linha.payload, "novo", contexto, {
      origem: "PDF",
      arquivo: "solar-sem-auto.pdf",
      userId: 1,
    });
  }
  const unidadesImportadas = [...contexto.unidadeIdsComDebitoImportado];
  adaptadorImportacaoDebitos.finalizarPersistencia(contexto, {
    userId: 1,
    origem: "PDF",
    arquivo: "solar-sem-auto.pdf",
  });

  assert.ok(unidadesImportadas.length >= 1);
  for (const unidadeId of unidadesImportadas) {
    const vigente = getCadastros().atribuicoesCobranca.find(
      (item) => item.unidadeId === unidadeId && !item.encerradoEm,
    );
    assert.equal(vigente, undefined, `unidade importada ${unidadeId} não deveria ter RE`);
  }

  atualizarConfigDistribuicaoAutomatica(1, { ativada: true, estrategia: "carga" });
});
