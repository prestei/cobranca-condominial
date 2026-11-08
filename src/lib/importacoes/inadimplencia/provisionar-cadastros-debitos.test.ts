import assert from "node:assert/strict";
import test from "node:test";
import { getCadastros, resetCadastrosParaTestes, setCondominios, setUnidades } from "@/data/catalogo";
import { provisionarCadastrosImportacaoDebitos } from "@/lib/importacoes/inadimplencia/provisionar-cadastros-debitos";

const MATRIZ = [
  [
    "Condomínio",
    "Unidade",
    "Referência",
    "Vencimento",
    "Valor atualizado",
  ],
  ["Condomínio Novo Import", "A-101", "09/2026", "05/09/2026", "R$ 100,00"],
  ["Condomínio Novo Import", "A-102", "09/2026", "06/09/2026", "R$ 200,00"],
];

test("provisionarCadastrosImportacaoDebitos cria condomínio e unidades ausentes", () => {
  resetCadastrosParaTestes();
  setCondominios(getCadastros().condominios.filter((item) => item.nome !== "Condomínio Novo Import"));
  setUnidades(getCadastros().unidades.filter((item) => item.identificacao !== "A-101" && item.identificacao !== "A-102"));

  const antesCondominios = getCadastros().condominios.length;
  const { condominiosCriados, unidadesCriadas } = provisionarCadastrosImportacaoDebitos(MATRIZ, 1, "PDF");

  assert.equal(condominiosCriados.length, 1);
  assert.equal(condominiosCriados[0]?.nome, "Condomínio Novo Import");
  assert.equal(unidadesCriadas.length, 2);
  assert.equal(getCadastros().condominios.length, antesCondominios + 1);
  assert.ok(getCadastros().unidades.some((item) => item.identificacao === "A-101"));
  assert.ok(getCadastros().unidades.some((item) => item.identificacao === "A-102"));
});
