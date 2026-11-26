import assert from "node:assert/strict";
import test from "node:test";
import type { Atendimento, AtribuicaoCobranca, Cadastros, Unidade } from "@/data/catalogo";
import {
  atendimentoComRetornoAberto,
  unidadeNoEscopoRetornoOperacional,
} from "@/lib/fila/escopo-retorno-operacional";

const cadastrosMinimo = (
  unidade: Unidade,
  atendimentos: Atendimento[],
  atribuicoes: AtribuicaoCobranca[] = [],
): Cadastros =>
  ({
    condominios: [{ id: unidade.condominioId, nome: "Cond", status: "Ativo", advogados: [] }],
    unidades: [unidade],
    atendimentos,
    atribuicoesCobranca: atribuicoes,
    usuarios: [
      { id: 3, nome: "Atendente", cargoId: 2, codigoRe: "RE-10003", ativo: true },
    ],
    cargos: [
      {
        id: 2,
        nome: "Atendente",
        permissaoJson: JSON.stringify({ atendimentos: { ler: true, criar: true } }),
      },
    ],
  }) as unknown as Cadastros;

const unidade: Unidade = {
  id: 37,
  condominioId: 1,
  identificacao: "T1-0901",
  bloco: "T1",
  tipo: "Apartamento",
  status: "Ativa",
  situacao: "Em acordo",
} as Unidade;

test("atendimentoComRetornoAberto ignora retorno já concluído", () => {
  assert.equal(
    atendimentoComRetornoAberto({
      dataProximaAcao: "2026-11-26T21:00:00",
      retornoConcluidoEm: "2026-11-26T10:00:00",
    }),
    false,
  );
  assert.equal(
    atendimentoComRetornoAberto({ dataProximaAcao: "2026-11-26T21:00:00", retornoConcluidoEm: "" }),
    true,
  );
});

test("escopo retorno inclui unidade com retorno do próprio atendente sem carteira vigente", () => {
  const atendimento: Atendimento = {
    id: "at-1",
    unidadeId: 37,
    condominioId: 1,
    usuarioId: 3,
    dataProximaAcao: "2026-11-26T21:00:00",
    retornoConcluidoEm: "",
    dataHora: "2026-11-20T10:00:00",
    status: "Pendente",
  } as Atendimento;

  const cadastros = cadastrosMinimo(unidade, [atendimento], []);
  assert.equal(unidadeNoEscopoRetornoOperacional(cadastros, 3, 37), true);
});

test("escopo retorno exclui unidade sem carteira e retorno de outro atendente", () => {
  const atendimento: Atendimento = {
    id: "at-2",
    unidadeId: 37,
    condominioId: 1,
    usuarioId: 99,
    dataProximaAcao: "2026-11-26T21:00:00",
    retornoConcluidoEm: "",
    dataHora: "2026-11-20T10:00:00",
    status: "Pendente",
  } as Atendimento;

  const cadastros = cadastrosMinimo(unidade, [atendimento], []);
  assert.equal(unidadeNoEscopoRetornoOperacional(cadastros, 3, 37), false);
});