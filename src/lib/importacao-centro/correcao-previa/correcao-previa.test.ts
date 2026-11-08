import assert from "node:assert/strict";
import test from "node:test";
import { resetCadastrosParaTestes } from "@/data/catalogo";
import { adaptadorImportacaoDebitos } from "@/lib/importacao-centro/adaptadores/debitos";
import { aplicarCorrecoesPayloadDebitos } from "@/lib/importacao-centro/correcao-previa/modulos/debitos";
import {
  _limparSessoesPreviaParaTeste,
  obterSessaoPreviaImportacao,
} from "@/lib/importacao-centro/correcao-previa/sessao";
import {
  corrigirLinhaPreviaDebitos,
  criarSessaoPreviaAposPreview,
} from "@/lib/importacao-centro/correcao-previa/servico";
import { pipelineConferencia } from "@/lib/importacao-centro/conferencia";
import { aplicarMotorValidacaoImportacao } from "@/lib/importacao-centro/motor-validacao";
import { lerArquivoImportacao } from "@/lib/importacao-centro/leitura-arquivo";
import type { DebitoImportRow } from "@/lib/importacoes/importar-debitos-planilha";

const CSV = `Unidade;Condomínio;Referência;Vencimento;Valor atualizado;Valor original;Multa;Juros;Correção
101;Condomínio Teste 1;09/2026;2026-09-15;-50,00;100,00;0;0;0
`;

test.beforeEach(() => {
  resetCadastrosParaTestes();
  _limparSessoesPreviaParaTeste();
});

test("aplicarCorrecoesPayloadDebitos rejeita campo não autorizado", () => {
  const row: DebitoImportRow = {
    condominioId: 1,
    unidadeId: 1,
    referencia: "09/2026",
    descricao: "",
    dataVencimento: "2026-09-15",
    valor: "100.00",
    valorOriginal: "100.00",
    multa: "0.00",
    juros: "0.00",
    correcao: "0.00",
    valorAtualizado: "-50.00",
    status: "Aberto",
    dataPagamento: "",
    valorPago: "",
    identificadorExterno: "",
  };
  const { erros } = aplicarCorrecoesPayloadDebitos(row, { referencia: "10/2026" });
  assert.ok(erros.some((item) => item.includes("não pode ser corrigido")));
});

test("corrigirLinhaPreviaDebitos remove erro financeiro e registra histórico", () => {
  const userId = 1;
  const matriz = lerArquivoImportacao(CSV);
  const contexto = adaptadorImportacaoDebitos.prepararContexto(userId);
  const parseadas = adaptadorImportacaoDebitos.interpretarMatriz(matriz, contexto);
  const resultadoMotor = aplicarMotorValidacaoImportacao(parseadas, {
    modulo: "debitos",
    matriz,
    contexto,
  });
  const linhasInternas = pipelineConferencia(resultadoMotor.linhas, adaptadorImportacaoDebitos, contexto);
  const linhaAlvo = linhasInternas.find((item) => item.linha === 2);
  assert.ok(linhaAlvo);
  assert.ok(
    linhaAlvo.validacao?.inconsistencias.some((item) => item.codigo === "financeira.valor_negativo"),
  );

  const sessaoPreviaId = "teste-sessao-08";
  criarSessaoPreviaAposPreview({
    sessaoPreviaId,
    userId,
    hashArquivo: "hash-teste",
    origem: "Superlógica",
    arquivo: "teste.csv",
    matriz,
    contexto,
    adapter: adaptadorImportacaoDebitos,
    parseadas: resultadoMotor.linhas,
    linhasInternas,
    inconsistenciasArquivo: resultadoMotor.inconsistenciasArquivo,
  });

  const resultado = corrigirLinhaPreviaDebitos(
    userId,
    {
      sessaoPreviaId,
      hashArquivo: "hash-teste",
      linha: 2,
      campos: { valorAtualizado: "150,00" },
    },
    adaptadorImportacaoDebitos,
  );

  assert.equal(resultado.correcaoAceita, true);
  assert.equal(resultado.historicoCorrecoes.length, 1);
  assert.equal(resultado.historicoCorrecoes[0]?.valorCorrigido, "150.00");
  assert.notEqual(resultado.linha.validacao?.resultado, "erro");

  const sessao = obterSessaoPreviaImportacao(userId, sessaoPreviaId, "hash-teste");
  assert.ok(sessao);
  assert.equal(sessao.historicoCorrecoes.length, 1);
  const linhaSessao = sessao.linhasInternas.find((item) => item.linha === 2);
  const originais = JSON.stringify(linhaSessao?.validacao?.dadosOriginais ?? {});
  assert.match(originais, /-50/);
  assert.equal(linhaSessao?.payload?.valorAtualizado, "150.00");
});
