import assert from "node:assert/strict";
import test from "node:test";
import {
  getCadastros,
  resetCadastrosParaTestes,
  SITUACAO_COBRANCA_PADRAO,
  type Condominio,
  type Unidade,
} from "@/data/catalogo";
import { sincronizarCondominiosDoServidor } from "@/lib/condominios/sync-cliente";
import { sincronizarUnidadesDoServidor } from "@/lib/unidades/sync-cliente";
import { mesclarCondominiosImportacao, mesclarUnidadesImportacao } from "@/lib/importacoes/sync-cliente";

const CONDOMINIO_NOVO: Condominio = {
  id: 9999,
  nome: "Edifício Solar das Palmeiras",
  identificadorExterno: "IMPORT-SOLAR",
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
};

const UNIDADE_NOVA: Unidade = {
  id: 8888,
  condominioId: 9999,
  identificacao: "A-0104",
  bloco: "A",
  tipo: "Apartamento",
  status: "Ativa",
  situacao: SITUACAO_COBRANCA_PADRAO,
};

test("sincronizarCondominiosDoServidor preserva condomínio provisionado ainda ausente no cliente", () => {
  resetCadastrosParaTestes();
  assert.equal(getCadastros().condominios.some((item) => item.id === 9999), false);

  sincronizarCondominiosDoServidor([...getCadastros().condominios, CONDOMINIO_NOVO], 1);

  assert.ok(getCadastros().condominios.some((item) => item.id === 9999));
  assert.equal(
    getCadastros().condominios.find((item) => item.id === 9999)?.nome,
    "Edifício Solar das Palmeiras",
  );
});

test("sincronizarUnidadesDoServidor preserva unidade provisionada ainda ausente no cliente", () => {
  resetCadastrosParaTestes();
  sincronizarCondominiosDoServidor([...getCadastros().condominios, CONDOMINIO_NOVO], 1);

  sincronizarUnidadesDoServidor([...getCadastros().unidades, UNIDADE_NOVA], 1);

  assert.ok(getCadastros().unidades.some((item) => item.id === 8888));
  assert.equal(getCadastros().unidades.find((item) => item.id === 8888)?.identificacao, "A-0104");
});

test("mesclarCondominios/UnidadesImportacao aplica cadastros novos da prévia de inadimplência", () => {
  resetCadastrosParaTestes();

  mesclarCondominiosImportacao([...getCadastros().condominios, CONDOMINIO_NOVO], 1);
  mesclarUnidadesImportacao([...getCadastros().unidades, UNIDADE_NOVA], 1);

  assert.ok(getCadastros().condominios.some((item) => item.nome === "Edifício Solar das Palmeiras"));
  assert.ok(getCadastros().unidades.some((item) => item.identificacao === "A-0104"));
});
