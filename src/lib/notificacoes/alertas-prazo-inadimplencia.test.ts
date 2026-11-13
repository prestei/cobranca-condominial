import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { Cadastros, Condominio, Debito, Unidade } from "@/data/catalogo";
import {
  ANTECEDENCIAS_PADRAO_DIAS,
  chaveIdempotenciaAlertaPrazo,
  debitoElegivelAlertaPrazo,
  marcosAlertaParaDebito,
  normalizarAntecedenciasDias,
} from "@/lib/notificacoes/alertas-prazo-inadimplencia";

function condominio(id: number, dias: number | null): Condominio {
  return {
    id,
    nome: "Residencial",
    identificadorExterno: "",
    status: "Ativo",
    advogados: [],
    administradora: "",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    cidade: "",
    estado: "",
    observacao: "",
    delinquencyTrackingDays: dias,
  };
}

function unidade(id: number, situacao: string): Unidade {
  return {
    id,
    condominioId: 1,
    identificacao: `U-${id}`,
    bloco: "",
    tipo: "Apartamento",
    status: "Ativa",
    situacao,
    observacao: "",
  };
}

function debito(id: number, vencimento: string, status: Debito["status"] = "Vencido"): Debito {
  return {
    id,
    condominioId: 1,
    unidadeId: 10,
    referencia: "03/2026",
    descricao: "Cota",
    dataVencimento: vencimento,
    valor: "100",
    valorOriginal: "100",
    multa: "0",
    juros: "0",
    correcao: "0",
    valorAtualizado: "100",
    status,
    dataPagamento: "",
    valorPago: "",
    origem: "PDF",
    identificadorExterno: "",
    fonteValores: "origem",
    atualizadoEm: vencimento,
  };
}

const catalogBase = (unidade: Unidade): Cadastros =>
  ({
    condominios: [condominio(1, 60)],
    unidades: [unidade],
    debitos: [],
    atribuicoesCobranca: [],
    usuarios: [],
    cargos: [],
  }) as Cadastros;

describe("T03 — elegibilidade e marcos", () => {
  test("padrão de antecedências 15, 7 e 3", () => {
    assert.deepEqual([...ANTECEDENCIAS_PADRAO_DIAS], [15, 7, 3]);
    const parsed = normalizarAntecedenciasDias([3, 15, 7, 3]);
    assert.ok(parsed.ok);
    assert.deepEqual(parsed.value, [15, 7, 3]);
  });

  test("ignora unidade fora da fila e débito quitado", () => {
    const aberto = debitoElegivelAlertaPrazo(
      debito(1, "2026-01-01"),
      catalogBase(unidade(10, "Em cobrança")),
    );
    assert.ok(aberto);

    const semCobranca = debitoElegivelAlertaPrazo(
      debito(2, "2026-01-01"),
      catalogBase(unidade(10, "Sem cobrança")),
    );
    assert.equal(semCobranca, null);

    const pago = debitoElegivelAlertaPrazo(
      debito(3, "2026-01-01", "Pago"),
      catalogBase(unidade(10, "Em cobrança")),
    );
    assert.equal(pago, null);
  });

  test("marcos de antecedência, atingido e ultrapassado", () => {
    const condo = condominio(1, 30);
    const config = { antecedenciasDias: [15, 7, 3] };
    const d = debito(5, "2026-01-01");

    const marco7 = marcosAlertaParaDebito(d, condo, "2026-01-24", config);
    assert.deepEqual(
      marco7.map((m) => (m.tipo === "antecedencia" ? m.dias : m.tipo)),
      [7],
    );

    const marcoAtingido = marcosAlertaParaDebito(d, condo, "2026-01-31", config);
    assert.ok(marcoAtingido.some((m) => m.tipo === "prazo_atingido"));

    const marcoUltrapassado = marcosAlertaParaDebito(d, condo, "2026-02-05", config);
    assert.ok(marcoUltrapassado.some((m) => m.tipo === "prazo_ultrapassado"));
  });

  test("idempotência inclui prazo do condomínio para reavaliar após alteração", () => {
    const chave30 = chaveIdempotenciaAlertaPrazo(9, 30, { tipo: "antecedencia", dias: 7 });
    const chave45 = chaveIdempotenciaAlertaPrazo(9, 45, { tipo: "antecedencia", dias: 7 });
    assert.notEqual(chave30, chave45);
    assert.match(chave30, /^inadimplencia_prazo:9:30:antecedencia_7$/);
  });
});
