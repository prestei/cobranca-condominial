import assert from "node:assert/strict";
import test from "node:test";
import { hashConteudoArquivo } from "@/lib/importacoes/hash-arquivo";
import { adaptadorImportacaoCondominios } from "@/lib/importacao-centro/adaptadores/condominios";
import { adaptadorImportacaoUnidades } from "@/lib/importacao-centro/adaptadores/unidades";
import { adaptadorImportacaoResponsaveis } from "@/lib/importacao-centro/adaptadores/responsaveis";
import { confirmarImportacaoCentral, previewImportacaoCentral } from "@/lib/importacao-centro/servico-central";
import { getCadastros, opcoesAdvogadosResponsaveis, resetCadastrosParaTestes } from "@/data/catalogo";

test("prévia e confirmação de condomínios usam pipeline central com aprovação explícita", async () => {
  resetCadastrosParaTestes();
  const advogado = opcoesAdvogadosResponsaveis(getCadastros())[0];
  assert.ok(advogado, "seed deve ter advogado");
  const conteudo = `Nome;Advogados\nCondomínio Teste Import;${advogado}\n`;
  const hash = hashConteudoArquivo(conteudo);

  const { preview } = await previewImportacaoCentral(adaptadorImportacaoCondominios, 1, {
    origem: "Teste",
    arquivo: "cond.csv",
    conteudo,
  });
  assert.ok(preview.resumoAprovacao?.podeConfirmar);
  assert.equal(preview.contadores.novos, 1);

  const antes = getCadastros().condominios.length;
  await confirmarImportacaoCentral(adaptadorImportacaoCondominios, 1, {
    origem: "Teste",
    arquivo: "cond.csv",
    conteudo,
    hashArquivo: hash,
    confirmacaoExplicita: true,
  });
  assert.equal(getCadastros().condominios.length, antes + 1);
  assert.equal(getCadastros().importacoes.some((item) => item.tipo === "condominios"), true);
});

test("prévia de unidades exige condomínio existente no escopo", async () => {
  resetCadastrosParaTestes();
  const condominio = getCadastros().condominios[0];
  assert.ok(condominio);
  const conteudo = `Unidade;Condomínio;Tipo\n9901;${condominio.nome};Apartamento\n`;
  const { preview } = await previewImportacaoCentral(adaptadorImportacaoUnidades, 1, {
    origem: "Teste",
    arquivo: "uni.csv",
    conteudo,
  });
  assert.equal(preview.contadores.novos, 1);
  assert.ok(preview.linhas.length >= 1);
});

test("prévia de responsáveis valida unidade existente", async () => {
  resetCadastrosParaTestes();
  const unidade = getCadastros().unidades[0];
  const condominio = getCadastros().condominios.find((item) => item.id === unidade.condominioId);
  assert.ok(condominio);
  const conteudo = `Condomínio ID;Unidade;Bloco;Nome;CPF/CNPJ;Tipo vínculo\n${condominio.id};${unidade.identificacao};${unidade.bloco};Novo Resp;864.464.880-43;Proprietario\n`;
  const { preview } = await previewImportacaoCentral(adaptadorImportacaoResponsaveis, 1, {
    origem: "Teste",
    arquivo: "resp.csv",
    conteudo,
  });
  assert.equal(preview.contadores.novos, 1, JSON.stringify(preview.linhas));
});
