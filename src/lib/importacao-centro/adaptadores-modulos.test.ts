import assert from "node:assert/strict";
import test from "node:test";
import { hashConteudoArquivo } from "@/lib/importacoes/hash-arquivo";
import { confirmarImportacaoPorModulo, previewImportacaoPorModulo } from "@/lib/importacao-centro/servico-central";
import { opcoesAdvogadosResponsaveis } from "@/data/catalogo";
import { getCadastros, resetCadastrosParaTestes } from "@/data/catalogo-store";

test("prévia e confirmação de condomínios usam pipeline central com aprovação explícita", async () => {
  resetCadastrosParaTestes();
  const advogado = opcoesAdvogadosResponsaveis(getCadastros())[0];
  assert.ok(advogado, "seed deve ter advogado");
  const conteudo = `Nome;Advogados\nCondomínio Teste Import;${advogado}\n`;
  const hash = hashConteudoArquivo(conteudo);
  const antes = getCadastros().condominios.length;

  const { preview } = await previewImportacaoPorModulo("condominios", 1, {
    origem: "Teste",
    arquivo: "cond.csv",
    conteudo,
  });
  assert.ok(preview.resumoAprovacao?.podeConfirmar);
  assert.equal(preview.contadores.novos, 1);
  assert.equal(getCadastros().condominios.length, antes, "prévia não persiste condomínios");

  await confirmarImportacaoPorModulo("condominios", 1, {
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
  const { preview } = await previewImportacaoPorModulo("unidades", 1, {
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
  const { preview } = await previewImportacaoPorModulo("responsaveis", 1, {
    origem: "Teste",
    arquivo: "resp.csv",
    conteudo,
  });
  assert.equal(preview.contadores.novos, 1, JSON.stringify(preview.linhas));
});
