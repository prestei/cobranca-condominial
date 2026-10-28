/**
 * Base fictícia para testes manuais (unidades 101–104).
 * Sem dados reais de moradores — CPFs e contatos são placeholders.
 */
import type {
  AtribuicaoCobranca,
  Condominio,
  Debito,
  Responsavel,
  Unidade,
  Vinculo,
} from "@/data/catalogo";

const ISO_SEED = "2026-10-01T12:00:00.000Z";

function debitoBase(
  id: number,
  condominioId: number,
  unidadeId: number,
  referencia: string,
  dataVencimento: string,
  valor: string,
): Debito {
  return {
    id,
    condominioId,
    unidadeId,
    referencia,
    descricao: "Cota ordinária (teste)",
    dataVencimento,
    valor,
    valorOriginal: valor,
    multa: "0.00",
    juros: "0.00",
    correcao: "0.00",
    valorAtualizado: valor,
    status: "Vencido",
    dataPagamento: "",
    valorPago: "",
    origem: "Outra administradora",
    identificadorExterno: `TEST-DEB-${id}`,
    atualizadoEm: ISO_SEED,
    fonteValores: "origem",
  };
}

export const condominiosBaseTeste: Condominio[] = [
  {
    id: 1,
    nome: "Condomínio Teste 1",
    identificadorExterno: "TEST-COND-1",
    status: "Ativo",
    advogados: ["Dra. Thamires"],
    administradora: "Administradora Fictícia",
    cep: "40000-000",
    logradouro: "Rua de Teste",
    numero: "100",
    complemento: "",
    cidade: "Salvador",
    estado: "BA",
    observacao: "Base de demonstração — unidades 101 e 102.",
  },
  {
    id: 2,
    nome: "Condomínio Teste 2",
    identificadorExterno: "TEST-COND-2",
    status: "Ativo",
    advogados: ["Dra. Thamires"],
    administradora: "Administradora Fictícia",
    cep: "40000-001",
    logradouro: "Av. de Teste",
    numero: "200",
    complemento: "",
    cidade: "Salvador",
    estado: "BA",
    observacao: "Base de demonstração — unidades 103 e 104.",
  },
];

export const unidadesBaseTeste: Unidade[] = [
  {
    id: 1,
    condominioId: 1,
    identificacao: "101",
    bloco: "A",
    tipo: "Apartamento",
    status: "Ativa",
    situacao: "Sem cobrança",
  },
  {
    id: 2,
    condominioId: 1,
    identificacao: "102",
    bloco: "A",
    tipo: "Apartamento",
    status: "Ativa",
    situacao: "Em cobrança",
  },
  {
    id: 3,
    condominioId: 2,
    identificacao: "103",
    bloco: "B",
    tipo: "Apartamento",
    status: "Ativa",
    situacao: "Em cobrança",
  },
  {
    id: 4,
    condominioId: 2,
    identificacao: "104",
    bloco: "B",
    tipo: "Apartamento",
    status: "Ativa",
    situacao: "Sem cobrança",
  },
];

export const responsaveisBaseTeste: Responsavel[] = [
  {
    id: 1,
    nome: "Ana Teste",
    cpfCnpj: "529.982.247-25",
    tipoPessoa: "Fisica",
    telefone: "71999001001",
    whatsapp: "71999001001",
    email: "ana.teste@example.invalid",
    endereco: "",
    observacoes: "Responsável fictício — unidade 101.",
  },
  {
    id: 2,
    nome: "Carlos Teste",
    cpfCnpj: "390.533.447-05",
    tipoPessoa: "Fisica",
    telefone: "71999001002",
    whatsapp: "71999001002",
    email: "carlos.teste@example.invalid",
    endereco: "",
    observacoes: "Responsável fictício — unidade 102.",
  },
  {
    id: 3,
    nome: "Bruno Teste",
    cpfCnpj: "153.509.460-56",
    tipoPessoa: "Fisica",
    telefone: "71999001003",
    whatsapp: "71999001003",
    email: "bruno.teste@example.invalid",
    endereco: "",
    observacoes: "Responsável fictício — unidade 103.",
  },
  {
    id: 4,
    nome: "Maria Teste",
    cpfCnpj: "231.002.999-00",
    tipoPessoa: "Fisica",
    telefone: "71999001004",
    whatsapp: "71999001004",
    email: "maria.teste@example.invalid",
    endereco: "",
    observacoes: "Responsável fictício — unidade 104.",
  },
];

export const vinculosBaseTeste: Vinculo[] = [
  {
    id: 1,
    unidadeId: 1,
    responsavelId: 1,
    tipoVinculo: "Proprietario",
    principal: true,
    observacoes: "",
  },
  {
    id: 2,
    unidadeId: 2,
    responsavelId: 2,
    tipoVinculo: "Proprietario",
    principal: true,
    observacoes: "",
  },
  {
    id: 3,
    unidadeId: 3,
    responsavelId: 3,
    tipoVinculo: "Proprietario",
    principal: true,
    observacoes: "",
  },
  {
    id: 4,
    unidadeId: 4,
    responsavelId: 4,
    tipoVinculo: "Proprietario",
    principal: true,
    observacoes: "",
  },
];

/** Unidade 102: set/2026 — R$ 350. Unidade 103: ago e set/2026 — R$ 350 cada (total R$ 700). */
export const debitosBaseTeste: Debito[] = [
  debitoBase(1, 1, 2, "09/2026", "2026-09-10", "350.00"),
  debitoBase(2, 2, 3, "08/2026", "2026-08-10", "350.00"),
  debitoBase(3, 2, 3, "09/2026", "2026-09-10", "350.00"),
];

/** Permite atendentes verem a fila (administradora vê todas sem atribuição). */
export const atribuicoesBaseTeste: AtribuicaoCobranca[] = [
  {
    id: 1,
    unidadeId: 2,
    atendenteId: 2,
    atribuidoPorId: 1,
    atribuidoEm: "2026-10-27T10:24:00.000Z",
    encerradoEm: null,
    motivo: "Base de teste — unidade 102",
    anteriorAtendenteId: null,
  },
  {
    id: 2,
    unidadeId: 3,
    atendenteId: 3,
    atribuidoPorId: 1,
    atribuidoEm: "2026-10-26T16:37:00.000Z",
    encerradoEm: null,
    motivo: "Base de teste — unidade 103",
    anteriorAtendenteId: null,
  },
];
