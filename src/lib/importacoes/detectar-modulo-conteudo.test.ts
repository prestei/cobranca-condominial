import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  detectarModuloImportacaoPorConteudo,
  mensagemModuloCorrigido,
} from "@/lib/importacoes/detectar-modulo-conteudo";
import { receberArquivoImportacao } from "@/lib/importacoes/receber-arquivo";
import { resetCadastrosParaTestes } from "@/data/catalogo-store";

test("planilha de inadimplência detectada como debitos mesmo pedindo condominios", () => {
  const matriz = [
    ["Condomínio", "Unidade", "Referência", "Vencimento", "Valor atualizado"],
    ["Solar", "A-0104", "04/2025", "10/04/2025", "1473.95"],
  ];
  assert.equal(
    detectarModuloImportacaoPorConteudo({ moduloSolicitado: "condominios", matriz }),
    "debitos",
  );
});

test("planilha só de condomínios permanece condominios", () => {
  const matriz = [
    ["Nome", "Advogados", "Administradora"],
    ["Residencial X", "Dra. Thamires", "Gestão"],
  ];
  assert.equal(
    detectarModuloImportacaoPorConteudo({ moduloSolicitado: "condominios", matriz }),
    "condominios",
  );
});

test("metadados de PDF de relatório forçam debitos", () => {
  assert.equal(
    detectarModuloImportacaoPorConteudo({
      moduloSolicitado: "unidades",
      metadadosRelatorio: {
        tipo: "relatorio-inadimplencia-gestao-v1",
        condominioNome: "Solar",
        paginas: 1,
        inconsistencias: [],
      },
    }),
    "debitos",
  );
});

test("mensagemModuloCorrigido só quando diverge", () => {
  assert.equal(mensagemModuloCorrigido("debitos", "debitos"), undefined);
  assert.match(mensagemModuloCorrigido("condominios", "debitos") ?? "", /inadimplência/);
});

test("receber PDF com módulo unidades redireciona para debitos e provisiona matriz", async () => {
  resetCadastrosParaTestes();
  const buffer = readFileSync("src/test/fixtures/relatorio-inadimplencia-solar-das-palmeiras.pdf");
  const recebido = await receberArquivoImportacao({
    userId: 1,
    modulo: "unidades",
    nomeArquivo: "solar.pdf",
    buffer,
    mimeDeclarado: "application/pdf",
  });
  assert.equal(recebido.moduloSolicitado, "unidades");
  assert.equal(recebido.moduloEfetivo, "debitos");
  assert.equal(recebido.moduloCorrigido, true);
  assert.ok(recebido.quantidadeRegistros >= 8);
  assert.ok(recebido.mensagemModulo);
});
