import assert from "node:assert/strict";
import test from "node:test";
import { getCadastros, setImportacoes } from "@/data/catalogo-store";
import {
  criarImportacaoEmProcessamento,
  obterImportacaoPorId,
  registrarPreviaImportacao,
  registrarHistoricoImportacao,
  sanitizarImportacaoParaConsulta,
} from "@/lib/importacao-centro/historico-auditoria";
import { adaptadorImportacaoDebitos } from "@/lib/importacao-centro/adaptadores/debitos";

test("cria rascunho em processamento e evoluí para conferência na prévia", () => {
  setImportacoes([]);

  const rascunho = criarImportacaoEmProcessamento({
    processoId: "proc-test-1",
    userId: 1,
    modulo: "debitos",
    arquivo: "inadimplencia.csv",
    quantidadeRegistros: 10,
  });

  assert.equal(rascunho.status, "Em processamento");
  assert.equal(rascunho.processoId, "proc-test-1");

  const aposPrevia = registrarPreviaImportacao({
    processoId: "proc-test-1",
    userId: 1,
    modulo: "debitos",
    origem: "Superlógica",
    arquivo: "inadimplencia.csv",
    hashArquivo: "abc123",
    quantidadeRegistros: 10,
    contadores: {
      novos: 5,
      atualizacoes: 1,
      duplicados: 2,
      erros: 1,
      manualProtegido: 0,
      ignorados: 0,
      revisoes: 0,
    },
  });

  assert.equal(aposPrevia.status, "Aguardando conferencia");
  assert.equal(aposPrevia.origem, "Superlógica");
  assert.equal(getCadastros().importacoes.length, 1);
});

test("finalização reutiliza o mesmo id do processo", () => {
  setImportacoes([]);
  criarImportacaoEmProcessamento({
    processoId: "proc-final",
    userId: 1,
    modulo: "debitos",
    arquivo: "planilha.csv",
  });

  const registro = adaptadorImportacaoDebitos.montarRegistroImportacao({
    userId: 1,
    origem: "PDF",
    arquivo: "planilha.csv",
    hashArquivo: "hash-final",
    processoId: "proc-final",
    quantidadeRegistros: 3,
    contadores: {
      novos: 2,
      atualizacoes: 0,
      duplicados: 0,
      erros: 0,
      manualProtegido: 0,
      ignorados: 1,
      revisoes: 0,
    },
    importacaoParcial: true,
    aprovacao: {
      confirmacaoExplicita: true,
      aprovadoPorUsuarioId: 1,
      aprovadoEm: "2026-11-07T12:00:00.000Z",
      hashArquivo: "hash-final",
      importacaoParcial: true,
    },
    relatorio: { erros: [], ignorados: [{ linha: 2, mensagem: "Ignorado" }] },
  });

  registrarHistoricoImportacao(registro);

  assert.equal(getCadastros().importacoes.length, 1);
  const salvo = obterImportacaoPorId(registro.id);
  assert.equal(salvo?.status, "Concluida parcialmente");
  assert.equal(salvo?.usuarioAprovacaoId, 1);
  assert.equal(salvo?.quantidadeIgnorados, "1");
});

test("sanitização oculta observação interna para perfil sem auditoria", () => {
  const consulta = sanitizarImportacaoParaConsulta(
    {
      id: 1,
      processoId: "p1",
      origem: "X",
      tipo: "debitos",
      arquivo: "a.csv",
      status: "Concluida",
      quantidadeRegistros: "1",
      quantidadeImportados: "1",
      quantidadeAtualizados: "0",
      quantidadeIgnorados: "0",
      quantidadeErros: "0",
      observacaoInterna: JSON.stringify({ hashArquivo: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" }),
      usuarioId: 1,
      dataImportacao: "2026-01-01T00:00:00.000Z",
    },
    { exporDetalhesInternos: false },
  );

  assert.equal(consulta.observacaoInterna, "");
  assert.ok(consulta.hashArquivoMascarado?.includes("…"));
});
