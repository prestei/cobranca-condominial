/**
 * Ticket 12 — permissões e escopo na importação de débitos.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, test } from "node:test";

process.env.NODE_ENV ??= "test";
process.env.AUTH_SECRET ??= "test-auth-secret-min-32-characters!!";

import { getCadastros, resetCadastrosParaTestes } from "@/data/catalogo-store";
import { ImportacaoCentroError } from "@/lib/importacao-centro/types";
import {
  ImportacaoDebitosError,
  confirmarImportacaoDebitos,
  previewImportacaoDebitos,
} from "@/lib/importacoes/debitos-service";
import { listarImportacoesHistorico } from "@/lib/importacoes/historico-service";
import { temPermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
import { parsePermissoesJson, serializarPermissoes } from "@/lib/permissions/parse";
import { PERMISSAO_JSON_ADMIN, PERMISSAO_JSON_ATENDENTE } from "@/lib/permissions/seeds";

const ADMIN_ID = 1;
const ATENDENTE_ID = 2;
const ADVOGADO_ID = 5;

const PLANILHA_VALIDA = [
  "Unidade;Bloco;Condomínio;Referência;Vencimento;Valor",
  "102;A;Condomínio Teste 1;09/2026;2026-09-15;350,00",
].join("\n");

beforeEach(() => {
  resetCadastrosParaTestes();
});

describe("Ticket 12 — mapa de permissões", () => {
  test("ações do fluxo respeitam perfil seed", async () => {
    assert.ok(await temPermissaoAcaoImportacao(ADMIN_ID, "iniciarImportacao"));
    assert.ok(await temPermissaoAcaoImportacao(ADMIN_ID, "visualizarPrevia"));
    assert.ok(await temPermissaoAcaoImportacao(ADMIN_ID, "corrigirRegistros"));
    assert.ok(await temPermissaoAcaoImportacao(ADMIN_ID, "aprovarImportacao"));
    assert.ok(await temPermissaoAcaoImportacao(ADMIN_ID, "consultarHistorico"));

    assert.ok(await temPermissaoAcaoImportacao(ATENDENTE_ID, "iniciarImportacao"));
    assert.ok(await temPermissaoAcaoImportacao(ATENDENTE_ID, "visualizarPrevia"));
    assert.ok(await temPermissaoAcaoImportacao(ATENDENTE_ID, "aprovarImportacao"));
    assert.ok(await temPermissaoAcaoImportacao(ATENDENTE_ID, "consultarHistorico"));

    assert.equal(await temPermissaoAcaoImportacao(ADVOGADO_ID, "iniciarImportacao"), false);
    assert.equal(await temPermissaoAcaoImportacao(ADVOGADO_ID, "visualizarPrevia"), false);
    assert.equal(await temPermissaoAcaoImportacao(ADVOGADO_ID, "aprovarImportacao"), false);
  });

  test("seed do Atendente inclui importações ler/criar/editar", () => {
    const perm = parsePermissoesJson(PERMISSAO_JSON_ATENDENTE);
    assert.equal(perm.importacoes?.ler, true);
    assert.equal(perm.importacoes?.criar, true);
    assert.equal(perm.importacoes?.editar, true);
    assert.notEqual(perm.importacoes?.excluir, true);
  });
});

describe("Ticket 12 — bloqueio no serviço", () => {
  test("advogado sem importações não gera prévia", async () => {
    await assert.rejects(
      () =>
        previewImportacaoDebitos(ADVOGADO_ID, {
          origem: "Outra administradora",
          arquivo: "debitos.csv",
          conteudo: PLANILHA_VALIDA,
        }),
      (err: unknown) => err instanceof ImportacaoDebitosError && err.status === 403,
    );
  });

  test("usuário só com criar consulta prévia mas não confirma", async () => {
    const cargoAdmin = getCadastros().cargos.find((item) => item.id === 1);
    assert.ok(cargoAdmin);
    const base = parsePermissoesJson(PERMISSAO_JSON_ADMIN);
    cargoAdmin.permissaoJson = serializarPermissoes({
      ...base,
      importacoes: { ler: true, criar: true },
    });

    const preview = await previewImportacaoDebitos(ADMIN_ID, {
      origem: "Outra administradora",
      arquivo: "debitos.csv",
      conteudo: PLANILHA_VALIDA,
    });
    assert.ok(preview.quantidadeRegistros >= 1);

    await assert.rejects(
      () =>
        confirmarImportacaoDebitos(ADMIN_ID, {
          origem: "Outra administradora",
          arquivo: "debitos.csv",
          conteudo: PLANILHA_VALIDA,
          confirmacaoExplicita: true,
        }),
      (err: unknown) => err instanceof ImportacaoCentroError && err.status === 403,
    );
  });

  test("sem ler não lista histórico", async () => {
    const cargoAdmin = getCadastros().cargos.find((item) => item.id === 1);
    assert.ok(cargoAdmin);
    const base = parsePermissoesJson(PERMISSAO_JSON_ADMIN);
    cargoAdmin.permissaoJson = serializarPermissoes({
      ...base,
      importacoes: { criar: true, editar: true },
    });

    await assert.rejects(
      () => listarImportacoesHistorico(ADMIN_ID),
      (err: unknown) => err instanceof ImportacaoCentroError && err.status === 403,
    );
  });
});
