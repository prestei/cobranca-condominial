import { getUsuarioLogadoIdOrNull } from "@/lib/auth/logged-in-user";
import { normalizarCodigoUsuario } from "@/lib/auth/login-code";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

export const advogados = ["Dra. Thamires", "Dra. Jullyane", "Dr. João"] as const;

export const statusCondominio = ["Ativo", "Inativo"] as const;
export type StatusCondominio = (typeof statusCondominio)[number];

export type Condominio = {
  id: number;
  nome: string;
  identificadorExterno: string;
  status: StatusCondominio;
  advogados: string[];
  administradora: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  cidade: string;
  estado: string;
  observacao: string;
};

export type Cargo = {
  id: number;
  nome: string;
  descricao: string;
  permissaoJson: string;
};

export type Usuario = {
  id: number;
  /** Código único de login do colaborador. */
  codigo: string;
  cargoId: number;
  nome: string;
  /** Apenas dígitos (11), vazio se não informado. */
  cpf: string;
  /** Apenas dígitos DDMMAAAA, vazio se não informado. */
  dataNascimento: string;
  telefone: string;
  email: string;
  senha: string;
};

export type Unidade = {
  id: number;
  condominioId: number;
  identificacao: string;
  bloco: string;
  tipo: string;
  status: string;
  situacao: string;
};

export type Responsavel = {
  id: number;
  nome: string;
  cpfCnpj: string;
  tipoPessoa: string;
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: string;
  observacoes: string;
};

export type Vinculo = {
  id: number;
  unidadeId: number;
  responsavelId: number;
  tipoVinculo: string;
  principal: boolean;
  observacoes: string;
};

export type Debito = {
  id: number;
  condominioId: number;
  unidadeId: number;
  referencia: string;
  descricao: string;
  dataVencimento: string;
  valor: string;
  valorOriginal: string;
  multa: string;
  juros: string;
  correcao: string;
  valorAtualizado: string;
  status: string;
  dataPagamento: string;
  valorPago: string;
  origem: string;
  identificadorExterno: string;
};

export type Atendimento = {
  id: string;
  unidadeId: string;
  responsavelId: string;
  usuarioId: number;
  dataHora: string;
  canal: string;
  respondeu: string;
  motivo: string;
  assunto: string;
  descricao: string;
  status: string;
  dataProximaAcao: string;
  proximaAcao: string;
};

export type Importacao = {
  id: number;
  origem: string;
  tipo: string;
  arquivo: string;
  status: string;
  quantidadeRegistros: string;
  quantidadeImportados: string;
  quantidadeAtualizados: string;
  quantidadeErros: string;
  observacaoInterna: string;
  usuarioId: number;
  dataImportacao: string;
};

export type Auditoria = {
  id: number;
  usuarioId: string;
  entidade: string;
  registroId: string;
  acao: string;
  dadosAnteriores: string;
  dadosNovos: string;
  camposAlterados: string;
  ip: string;
  userAgent: string;
  dataHora: string;
};

export const tiposUnidade = ["Apartamento", "Casa", "Sala", "Loja"] as const;
export const statusUnidade = ["Ativa", "Inativa"] as const;
/** Sem cobrança = fora da fila de inadimplência; demais estados entram com débito/importação ou movimentação operacional. */
export const situacoesUnidade = ["Sem cobrança", "Em cobrança", "Em acordo", "Notificada", "Ajuizada", "Quitada"] as const;
export const SITUACAO_COBRANCA_PADRAO: (typeof situacoesUnidade)[number] = "Sem cobrança";
export const tiposPessoa = ["Fisica", "Juridica"] as const;
export const tiposVinculo = ["Proprietario", "Inquilino", "Administrador", "Sindico"] as const;
export const statusDebito = ["Pendente", "Pago", "Vencido", "Cancelado"] as const;
export const origensDebito = ["Superlógica", "PDF", "Outra administradora"] as const;
export const canaisAtendimento = ["WhatsApp", "Telefone", "E-mail", "SMS", "Presencial", "Carta/notificação"] as const;
export const LIMITE_AMIGAVEL_DIAS = 60;
export const motivosPendencia = [
  "Dificuldade financeira",
  "Desemprego",
  "Doença / problema de saúde",
  "Esqueceu o vencimento",
  "Não recebeu o boleto",
  "Discorda do valor cobrado",
  "Aguarda proposta de acordo",
  "Já pagou (enviar comprovante)",
  "Inquilino é o responsável",
  "Falecimento / inventário",
  "Imóvel à venda ou em disputa",
  "Recusa-se a pagar",
  "Não informou o motivo",
  "Outro",
] as const;
export const gruposDebito = ["Cota ordinária", "Taxa extra", "Acordo", "Multa por infração", "Outros"] as const;
export const faixasAtraso = [
  { label: "Até 30 dias", min: 0, max: 30 },
  { label: "31–60 dias", min: 31, max: 60 },
  { label: "61–90 dias", min: 61, max: 90 },
  { label: "91–180 dias", min: 91, max: 180 },
  { label: "181–365 dias", min: 181, max: 365 },
  { label: "1–2 anos", min: 366, max: 730 },
  { label: "Mais de 2 anos", min: 731, max: Number.POSITIVE_INFINITY },
] as const;
export const statusAtendimento = ["Pendente", "Resolvido"] as const;
export const tiposImportacao = ["debitos", "responsaveis", "unidades"] as const;
export const statusImportacao = ["Processando", "Concluida", "Erro", "Cancelada"] as const;
export const acoesAuditoria = ["INSERT", "UPDATE", "DELETE"] as const;

const condominiosIniciais: Condominio[] = [
  {
    id: 1,
    nome: "Condomínio Teste Alpha",
    identificadorExterno: "TEST-001",
    status: "Ativo",
    advogados: ["Dra. Thamires"],
    administradora: "Administradora Exemplo",
    cep: "41820-020",
    logradouro: "Rua das Palmeiras",
    numero: "100",
    complemento: "Bloco A",
    cidade: "Salvador",
    estado: "BA",
    observacao: "Cadastro fictício para desenvolvimento.",
  },
  {
    id: 2,
    nome: "Condomínio Teste Beta",
    identificadorExterno: "TEST-002",
    status: "Ativo",
    advogados: ["Dra. Jullyane"],
    administradora: "Superlógica Demo",
    cep: "42700-000",
    logradouro: "Av. Central",
    numero: "250",
    complemento: "",
    cidade: "Lauro de Freitas",
    estado: "BA",
    observacao: "",
  },
  {
    id: 3,
    nome: "Condomínio Teste Gamma",
    identificadorExterno: "TEST-003",
    status: "Ativo",
    advogados: ["Dr. João", "Dra. Thamires"],
    administradora: "Administradora Exemplo",
    cep: "40070-110",
    logradouro: "Largo do Pelourinho",
    numero: "12",
    complemento: "Ed. Comercial",
    cidade: "Salvador",
    estado: "BA",
    observacao: "Dois advogados vinculados para teste.",
  },
  {
    id: 4,
    nome: "Condomínio Teste Delta",
    identificadorExterno: "TEST-004",
    status: "Inativo",
    advogados: ["Dra. Jullyane"],
    administradora: "PDF Importações",
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    cidade: "Camaçari",
    estado: "BA",
    observacao: "Inativo — histórico deve permanecer consultável.",
  },
  {
    id: 5,
    nome: "Condomínio Teste Épsilon",
    identificadorExterno: "TEST-005",
    status: "Ativo",
    advogados: ["Dr. João"],
    administradora: "",
    cep: "41650-010",
    logradouro: "Rua do Sol",
    numero: "45",
    complemento: "",
    cidade: "Salvador",
    estado: "BA",
    observacao: "",
  },
];

/** bcrypt de `12345` — senha padrão de demonstração (ver SENHA_DEMONSTRACAO). */
const SENHA_INICIAL_HASH = "$2b$12$i28E0e.k2Ld.FSrys.myW.0bPQ/a9quiTz07iVchW67QFbPQN1gie";
const SENHA_TESTE_HASH = SENHA_INICIAL_HASH;

const usuariosIniciais: Usuario[] = [
  {
    id: 1,
    codigo: "MILENA",
    cargoId: 1,
    nome: "Milena",
    cpf: "52998224725",
    dataNascimento: "15031990",
    telefone: "71999990001",
    email: "milena@escritorio.example",
    senha: SENHA_INICIAL_HASH,
  },
  {
    id: 2,
    codigo: "RAQUEL",
    cargoId: 2,
    nome: "Raquel",
    cpf: "",
    dataNascimento: "",
    telefone: "71999990002",
    email: "raquel@escritorio.example",
    senha: SENHA_INICIAL_HASH,
  },
  {
    id: 3,
    codigo: "TASSIA",
    cargoId: 2,
    nome: "Tássia",
    cpf: "",
    dataNascimento: "",
    telefone: "71999990003",
    email: "tassia@escritorio.example",
    senha: SENHA_INICIAL_HASH,
  },
  {
    id: 4,
    codigo: "ATD003",
    cargoId: 2,
    nome: "Atendente 3",
    cpf: "",
    dataNascimento: "",
    telefone: "",
    email: "atendente3@escritorio.example",
    senha: SENHA_INICIAL_HASH,
  },
  {
    id: 5,
    codigo: "ADRYELLE",
    cargoId: 3,
    nome: "Dra. Adryelle",
    cpf: "",
    dataNascimento: "",
    telefone: "71999990005",
    email: "adryelle@escritorio.example",
    senha: SENHA_INICIAL_HASH,
  },
  {
    id: 6,
    codigo: "12345",
    cargoId: 1,
    nome: "Usuário Teste",
    cpf: "",
    dataNascimento: "",
    telefone: "",
    email: "teste@escritorio.example",
    senha: SENHA_TESTE_HASH,
  },
];

const unidadesIniciais: Unidade[] = [
  { id: 1, condominioId: 1, identificacao: "101", bloco: "A", tipo: "Apartamento", status: "Ativa", situacao: "Em cobrança" },
  { id: 2, condominioId: 1, identificacao: "102", bloco: "A", tipo: "Apartamento", status: "Ativa", situacao: "Em cobrança" },
  { id: 3, condominioId: 1, identificacao: "201", bloco: "B", tipo: "Apartamento", status: "Inativa", situacao: "Quitada" },
  { id: 4, condominioId: 2, identificacao: "B-203", bloco: "B", tipo: "Apartamento", status: "Ativa", situacao: "Em acordo" },
  { id: 5, condominioId: 3, identificacao: "Sala 3", bloco: "Torre 1", tipo: "Sala", status: "Ativa", situacao: "Em cobrança" },
  { id: 6, condominioId: 4, identificacao: "12", bloco: "", tipo: "Casa", status: "Ativa", situacao: "Notificada" },
];

const responsaveisIniciais: Responsavel[] = [
  {
    id: 1,
    nome: "Ana Souza",
    cpfCnpj: "123.456.789-09",
    tipoPessoa: "Fisica",
    telefone: "71988880001",
    whatsapp: "71988880001",
    email: "ana.souza@example.com",
    endereco: "Rua das Flores, 120, Salvador/BA",
    observacoes: "",
  },
  {
    id: 2,
    nome: "Carlos Mendes",
    cpfCnpj: "987.654.321-00",
    tipoPessoa: "Fisica",
    telefone: "71988880002",
    whatsapp: "",
    email: "carlos.mendes@example.com",
    endereco: "",
    observacoes: "Inquilino da unidade 101.",
  },
  {
    id: 3,
    nome: "Verde Administração Ltda",
    cpfCnpj: "12.345.678/0001-90",
    tipoPessoa: "Juridica",
    telefone: "7133330000",
    whatsapp: "",
    email: "contato@verde.example",
    endereco: "Av. Oceânica, 500, Salvador/BA",
    observacoes: "",
  },
];

const vinculosIniciais: Vinculo[] = [
  { id: 1, unidadeId: 1, responsavelId: 1, tipoVinculo: "Proprietario", principal: true, observacoes: "" },
  { id: 2, unidadeId: 1, responsavelId: 2, tipoVinculo: "Inquilino", principal: false, observacoes: "" },
  { id: 3, unidadeId: 4, responsavelId: 3, tipoVinculo: "Administrador", principal: true, observacoes: "" },
  { id: 4, unidadeId: 6, responsavelId: 1, tipoVinculo: "Sindico", principal: true, observacoes: "Mandato atual." },
];

const debitosIniciais: Debito[] = [
  {
    id: 1,
    condominioId: 1,
    unidadeId: 1,
    referencia: "09/2026",
    descricao: "Cotas do Mês",
    dataVencimento: "2026-09-10",
    valor: "850.00",
    valorOriginal: "850.00",
    multa: "17.00",
    juros: "8.50",
    correcao: "0.00",
    valorAtualizado: "875.50",
    status: "Vencido",
    dataPagamento: "",
    valorPago: "",
    origem: "Superlógica",
    identificadorExterno: "AZ-101-092026",
  },
  {
    id: 2,
    condominioId: 1,
    unidadeId: 2,
    referencia: "05/2026",
    descricao: "Taxa Extra",
    dataVencimento: "2026-05-10",
    valor: "1200.00",
    valorOriginal: "1200.00",
    multa: "24.00",
    juros: "36.00",
    correcao: "12.00",
    valorAtualizado: "1272.00",
    status: "Vencido",
    dataPagamento: "",
    valorPago: "",
    origem: "PDF",
    identificadorExterno: "",
  },
  {
    id: 3,
    condominioId: 2,
    unidadeId: 4,
    referencia: "07/2026",
    descricao: "Acordo",
    dataVencimento: "2026-07-15",
    valor: "500.00",
    valorOriginal: "500.00",
    multa: "0.00",
    juros: "0.00",
    correcao: "0.00",
    valorAtualizado: "500.00",
    status: "Pago",
    dataPagamento: "2026-07-14",
    valorPago: "500.00",
    origem: "Superlógica",
    identificadorExterno: "ID-B203-072026",
  },
  {
    id: 4,
    condominioId: 1,
    unidadeId: 1,
    referencia: "11/2021",
    descricao: "Cotas do Mês",
    dataVencimento: "2021-11-10",
    valor: "640.00",
    valorOriginal: "640.00",
    multa: "12.80",
    juros: "220.00",
    correcao: "80.00",
    valorAtualizado: "952.80",
    status: "Vencido",
    dataPagamento: "",
    valorPago: "",
    origem: "PDF",
    identificadorExterno: "AZ-101-112021",
  },
  {
    id: 5,
    condominioId: 1,
    unidadeId: 2,
    referencia: "09/2026",
    descricao: "Cotas do Mês",
    dataVencimento: "2026-09-10",
    valor: "430.00",
    valorOriginal: "430.00",
    multa: "8.60",
    juros: "4.30",
    correcao: "0.00",
    valorAtualizado: "442.90",
    status: "Pago",
    dataPagamento: "2026-10-04",
    valorPago: "442.90",
    origem: "Superlógica",
    identificadorExterno: "AZ-102-092026",
  },
  {
    id: 6,
    condominioId: 3,
    unidadeId: 5,
    referencia: "08/2026",
    descricao: "Cotas do Mês",
    dataVencimento: "2026-08-06",
    valor: "980.00",
    valorOriginal: "980.00",
    multa: "19.60",
    juros: "29.40",
    correcao: "0.00",
    valorAtualizado: "1029.00",
    status: "Vencido",
    dataPagamento: "",
    valorPago: "",
    origem: "PDF",
    identificadorExterno: "",
  },
  {
    id: 7,
    condominioId: 4,
    unidadeId: 6,
    referencia: "06/2026",
    descricao: "Acordo",
    dataVencimento: "2026-06-15",
    valor: "700.00",
    valorOriginal: "700.00",
    multa: "14.00",
    juros: "21.00",
    correcao: "0.00",
    valorAtualizado: "735.00",
    status: "Vencido",
    dataPagamento: "",
    valorPago: "",
    origem: "PDF",
    identificadorExterno: "",
  },
  {
    id: 8,
    condominioId: 1,
    unidadeId: 1,
    referencia: "03/2026",
    descricao: "Multas Infrações",
    dataVencimento: "2026-03-10",
    valor: "150.00",
    valorOriginal: "150.00",
    multa: "3.00",
    juros: "9.00",
    correcao: "0.00",
    valorAtualizado: "162.00",
    status: "Vencido",
    dataPagamento: "",
    valorPago: "",
    origem: "PDF",
    identificadorExterno: "",
  },
];

const atendimentosIniciais: Atendimento[] = [
  {
    id: "atd-1",
    unidadeId: "1",
    responsavelId: "1",
    usuarioId: 2,
    dataHora: "2026-09-20T14:30",
    canal: "WhatsApp",
    respondeu: "Sim",
    motivo: "Dificuldade financeira",
    assunto: "Cota de setembro",
    descricao: "Pediu para retornar após o dia 25.",
    status: "Pendente",
    dataProximaAcao: "2026-09-25",
    proximaAcao: "Nova tentativa de contato",
  },
  {
    id: "atd-2",
    unidadeId: "4",
    responsavelId: "3",
    usuarioId: 3,
    dataHora: "2026-09-18T09:15",
    canal: "Telefone",
    respondeu: "Sim",
    motivo: "Já pagou (enviar comprovante)",
    assunto: "Confirmação de acordo",
    descricao: "Administradora confirmou o pagamento da parcela.",
    status: "Resolvido",
    dataProximaAcao: "",
    proximaAcao: "",
  },
  {
    id: "atd-3",
    unidadeId: "2",
    responsavelId: "1",
    usuarioId: 2,
    dataHora: "2026-09-22T11:00",
    canal: "WhatsApp",
    respondeu: "Não",
    motivo: "",
    assunto: "Taxa extra",
    descricao: "Mensagem sem resposta.",
    status: "Pendente",
    dataProximaAcao: "2026-10-06",
    proximaAcao: "Nova tentativa",
  },
  {
    id: "atd-4",
    unidadeId: "1",
    responsavelId: "1",
    usuarioId: 2,
    dataHora: "2026-10-05T10:15",
    canal: "Telefone",
    respondeu: "Sim",
    motivo: "Esqueceu o vencimento",
    assunto: "Cota de setembro",
    descricao: "Disse que paga nesta semana.",
    status: "Pendente",
    dataProximaAcao: "2026-10-08",
    proximaAcao: "Confirmar pagamento",
  },
  {
    id: "atd-5",
    unidadeId: "5",
    responsavelId: "",
    usuarioId: 3,
    dataHora: "2026-10-03T16:40",
    canal: "E-mail",
    respondeu: "Não",
    motivo: "",
    assunto: "Cota de agosto",
    descricao: "E-mail sem retorno.",
    status: "Pendente",
    dataProximaAcao: "2026-10-05",
    proximaAcao: "Ligar",
  },
  {
    id: "atd-6",
    unidadeId: "6",
    responsavelId: "1",
    usuarioId: 3,
    dataHora: "2026-10-01T09:05",
    canal: "WhatsApp",
    respondeu: "Sim",
    motivo: "Aguarda proposta de acordo",
    assunto: "Parcela de acordo",
    descricao: "Pediu nova proposta.",
    status: "Pendente",
    dataProximaAcao: "2026-10-10",
    proximaAcao: "Enviar proposta",
  },
];

const importacoesIniciais: Importacao[] = [
  {
    id: 1,
    origem: "Superlógica",
    tipo: "debitos",
    arquivo: "inadimplencia-azaleias-2026-09.pdf",
    status: "Concluida",
    quantidadeRegistros: "249",
    quantidadeImportados: "240",
    quantidadeAtualizados: "8",
    quantidadeErros: "1",
    observacaoInterna: "Um registro sem unidade.",
    usuarioId: 1,
    dataImportacao: "2026-09-25T18:00",
  },
  {
    id: 2,
    origem: "PDF",
    tipo: "unidades",
    arquivo: "unidades-ideale.csv",
    status: "Erro",
    quantidadeRegistros: "40",
    quantidadeImportados: "0",
    quantidadeAtualizados: "0",
    quantidadeErros: "40",
    observacaoInterna: "Cabeçalho diferente do modelo.",
    usuarioId: 1,
    dataImportacao: "2026-09-26T10:12",
  },
];

const auditoriaInicial: Auditoria[] = [
  {
    id: 1,
    usuarioId: "1",
    entidade: "debt",
    registroId: "3",
    acao: "UPDATE",
    dadosAnteriores: '{"status":"Pendente"}',
    dadosNovos: '{"status":"Pago"}',
    camposAlterados: "status, data_pagamento, valor_pago",
    ip: "127.0.0.1",
    userAgent: "Navegador interno",
    dataHora: "2026-07-14T11:05",
  },
  {
    id: 2,
    usuarioId: "1",
    entidade: "condominium",
    registroId: "6",
    acao: "INSERT",
    dadosAnteriores: "",
    dadosNovos: '{"nome":"Azaleias"}',
    camposAlterados: "nome",
    ip: "127.0.0.1",
    userAgent: "Navegador interno",
    dataHora: "2026-09-01T08:00",
  },
  {
    id: 3,
    usuarioId: "2",
    entidade: "service_ticket",
    registroId: "atd-1",
    acao: "INSERT",
    dadosAnteriores: "",
    dadosNovos: '{"canal":"WhatsApp"}',
    camposAlterados: "canal, assunto, descricao",
    ip: "127.0.0.1",
    userAgent: "Navegador interno",
    dataHora: "2026-09-20T14:30",
  },
];

type Cadastros = {
  condominios: Condominio[];
  cargos: Cargo[];
  usuarios: Usuario[];
  unidades: Unidade[];
  responsaveis: Responsavel[];
  vinculos: Vinculo[];
  debitos: Debito[];
  atendimentos: Atendimento[];
  importacoes: Importacao[];
  auditoria: Auditoria[];
};

let state: Cadastros = {
  condominios: condominiosIniciais,
  cargos: [],
  usuarios: usuariosIniciais,
  unidades: unidadesIniciais,
  responsaveis: responsaveisIniciais,
  vinculos: vinculosIniciais,
  debitos: debitosIniciais,
  atendimentos: atendimentosIniciais,
  importacoes: importacoesIniciais,
  auditoria: auditoriaInicial,
};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribeCadastros(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function usuariosComSeed() {
  const map = new Map(state.usuarios.map((item) => [item.id, item]));
  for (const seed of usuariosIniciais) {
    if (!map.has(seed.id)) {
      map.set(seed.id, seed);
    }
  }
  return [...map.values()].sort((a, b) => a.id - b.id);
}

function normalizarUnidade(item: Unidade): Unidade {
  return {
    ...item,
    bloco: item.bloco ?? "",
    situacao: situacaoCobrancaUnidade(item),
  };
}

function montarCadastros(): Cadastros {
  return {
    ...state,
    usuarios: usuariosComSeed(),
    unidades: state.unidades.map(normalizarUnidade),
  };
}

/** Referência estável para SSR/hidratação (`useSyncExternalStore`). */
export const cadastrosServerSnapshot: Cadastros = montarCadastros();

let cadastrosClientSnapshot: Cadastros = cadastrosServerSnapshot;

function atualizarCadastrosSnapshot() {
  cadastrosClientSnapshot = montarCadastros();
}

export function getCadastros() {
  return cadastrosClientSnapshot;
}

export function getCadastrosServerSnapshot() {
  return cadastrosServerSnapshot;
}

/** @deprecated Login e credenciais usam PostgreSQL (`src/lib/auth/credentials.ts`). */
export function buscarUsuarioPorCodigoLogin(codigo: string) {
  const chave = normalizarCodigoUsuario(codigo);
  if (!chave) return undefined;
  return getCadastros().usuarios.find((item) => normalizarCodigoUsuario(item.codigo) === chave);
}

function atualizar<K extends keyof Cadastros>(key: K, next: Cadastros[K] | ((current: Cadastros[K]) => Cadastros[K])) {
  const value = typeof next === "function" ? next(state[key]) : next;
  state = { ...state, [key]: value };
  atualizarCadastrosSnapshot();
  emit();
}

export function setCondominios(next: Condominio[] | ((current: Condominio[]) => Condominio[])) {
  atualizar("condominios", next);
}

export function setCargos(next: Cargo[] | ((current: Cargo[]) => Cargo[])) {
  atualizar("cargos", next);
}

export function setUsuarios(next: Usuario[] | ((current: Usuario[]) => Usuario[])) {
  atualizar("usuarios", next);
}

export function setUnidades(next: Unidade[] | ((current: Unidade[]) => Unidade[])) {
  atualizar("unidades", next);
}

export function setResponsaveis(next: Responsavel[] | ((current: Responsavel[]) => Responsavel[])) {
  atualizar("responsaveis", next);
}

export function setVinculos(next: Vinculo[] | ((current: Vinculo[]) => Vinculo[])) {
  atualizar("vinculos", next);
}

export function setDebitos(next: Debito[] | ((current: Debito[]) => Debito[])) {
  atualizar("debitos", next);
}

export function setAtendimentos(next: Atendimento[] | ((current: Atendimento[]) => Atendimento[])) {
  atualizar("atendimentos", next);
}

export function setImportacoes(next: Importacao[] | ((current: Importacao[]) => Importacao[])) {
  atualizar("importacoes", next);
}

export function registrarAuditoria(
  entry: Pick<Auditoria, "entidade" | "registroId" | "acao" | "dadosAnteriores" | "dadosNovos" | "camposAlterados"> & {
    usuarioId?: string;
  },
  usuarioId?: number,
  meta?: { ip?: string; userAgent?: string },
) {
  const { usuarioId: usuarioIdFromEntry, ...rest } = entry;
  const registro: Auditoria = {
    id: state.auditoria.reduce((max, item) => Math.max(max, item.id), 0) + 1,
    usuarioId: String(usuarioId ?? usuarioIdFromEntry ?? getUsuarioLogadoIdOrNull() ?? ID_USUARIO_SESSAO),
    ip: meta?.ip ?? "",
    userAgent: meta?.userAgent ?? "",
    dataHora: agoraIso(),
    ...rest,
  };
  state = { ...state, auditoria: [registro, ...state.auditoria] };
  atualizarCadastrosSnapshot();
  emit();
}

export function formatarData(value: string) {
  if (!value) return "—";
  const [datePart, timePart] = value.split("T");
  const [year, month, day] = datePart.split("-");
  if (!year || !month || !day) return value;
  const data = `${day}/${month}/${year}`;
  if (!timePart) return data;
  return `${data} ${timePart.slice(0, 5)}`;
}

export function formatarMoeda(value: string) {
  if (!value.trim()) return "—";
  const number = Number(value);
  if (Number.isNaN(number)) return value;
  return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function agoraIso() {
  const now = new Date();
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function hojeIso() {
  return agoraIso().slice(0, 10);
}

/** @deprecated Use o ID da sessão autenticada (`useAuth` / `getUsuarioLogadoId`). */
export const ID_USUARIO_SESSAO = 1;

export function saudacaoDoDia(agora = new Date()) {
  const hora = agora.getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

export function iniciaisNome(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "—";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0] ?? ""}${partes[partes.length - 1][0] ?? ""}`.toUpperCase();
}

export function primeiroNome(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "—";
  if (partes[0].endsWith(".") && partes.length > 1) return partes[1];
  return partes[0];
}

export function tituloInicio(nomeCompleto: string, agora = new Date()) {
  return `${saudacaoDoDia(agora)}, ${primeiroNome(nomeCompleto)}`;
}

function idUsuarioEscopo(usuarioId?: number) {
  return usuarioId ?? getUsuarioLogadoIdOrNull() ?? ID_USUARIO_SESSAO;
}

export function rotuloAdvogadosCondominio(item: Condominio) {
  if (item.advogados.length === 0) return "—";
  return item.advogados.join(", ");
}

export function advogadoPrincipalCondominio(item: Condominio) {
  return item.advogados[0] ?? "";
}

export function condominioAtendeAdvogado(item: Condominio, advogado: string) {
  if (!advogado) return false;
  return item.advogados.includes(advogado);
}

export function condominioAtivo(item: Condominio) {
  return item.status === "Ativo";
}

/** Advogados que podem ser vinculados ao condomínio (carteira + colaboradores com cargo Advogado). */
export function opcoesAdvogadosResponsaveis(cadastros: { usuarios: Usuario[]; cargos: Cargo[] }) {
  const idsAdvogado = new Set(
    cadastros.cargos.filter((item) => item.nome === "Advogado").map((item) => item.id),
  );
  const nomesUsuarios = cadastros.usuarios
    .filter((item) => idsAdvogado.has(item.cargoId))
    .map((item) => item.nome.trim())
    .filter(Boolean);
  return [...new Set([...advogados, ...nomesUsuarios])].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function escopoUnidades(cadastros: Cadastros, usuarioId?: number): Unidade[] {
  const ids = new Set(escopoCondominios(cadastros, usuarioId).map((item) => item.id));
  return cadastros.unidades.filter((item) => ids.has(item.condominioId));
}

export function escopoCondominios(cadastros: Cadastros, usuarioId?: number): Condominio[] {
  const id = idUsuarioEscopo(usuarioId);
  const usuario = cadastros.usuarios.find((item) => item.id === id);
  if (!usuario) return [];
  const perm = permissoesDoUsuarioId(id, cadastros);
  if (temPermissao(perm, "condominios", "editar") || temPermissao(perm, "condominios", "criar")) {
    return cadastros.condominios;
  }
  if (temPermissao(perm, "condominios", "ler")) {
    return cadastros.condominios.filter((item) => item.advogados.includes(usuario.nome));
  }
  if (temPermissao(perm, "atendimentos", "ler")) {
    return cadastros.condominios.filter((item) => item.status === "Ativo");
  }
  return [];
}

export function usuarioSessaoApp(cadastros: { usuarios: Usuario[]; cargos: Cargo[] }, userId?: number) {
  const sessaoId = idUsuarioEscopo(userId);
  const usuario = cadastros.usuarios.find((item) => item.id === sessaoId) ?? cadastros.usuarios[0];
  if (!usuario) {
    return { name: "—", initials: "—", menuSubtitle: "" };
  }
  const cargo = cadastros.cargos.find((item) => item.id === usuario.cargoId);
  return {
    name: usuario.nome,
    initials: iniciaisNome(usuario.nome),
    menuSubtitle: cargo?.nome ?? "",
  };
}

export function debitoEmAberto(item: { status: string }) {
  return item.status === "Pendente" || item.status === "Vencido";
}

/** Unidade quitada permanece consultável, mas não entra na fila operacional de cobrança. */
const SITUACOES_FILA_COBRANCA_ATIVA = new Set<string>(["Em cobrança", "Em acordo", "Notificada", "Ajuizada"]);

export function unidadeNaFilaCobrancaAtiva(item: { situacao?: string }) {
  return SITUACOES_FILA_COBRANCA_ATIVA.has(situacaoCobrancaUnidade(item));
}

/** Indica se a listagem deve tratar a unidade como inadimplente (débito vencido em aberto). */
export function unidadeComDebitoOperacional(item: { situacao?: string }, temDebitoVencidoAberto: boolean) {
  if (!unidadeNaFilaCobrancaAtiva(item)) return false;
  return temDebitoVencidoAberto;
}

export function situacaoCobrancaUnidade(item: { situacao?: string }) {
  const raw = item.situacao?.trim();
  if (!raw || raw === "Regular") return SITUACAO_COBRANCA_PADRAO;
  return raw;
}

export function debitoAbertoNaData(
  item: { status: string; dataVencimento: string; dataPagamento: string },
  dataBase: string,
) {
  if (item.status === "Cancelado") return false;
  if (!item.dataVencimento || item.dataVencimento > dataBase) return false;
  if (item.status === "Pago" && item.dataPagamento && item.dataPagamento <= dataBase) return false;
  return true;
}

export function acimaDoLimite(dias: number, limite = LIMITE_AMIGAVEL_DIAS) {
  return dias >= limite;
}

export function dataCorteLimite(dataBase: string, limite = LIMITE_AMIGAVEL_DIAS) {
  const data = new Date(`${dataBase}T00:00:00`);
  if (Number.isNaN(data.getTime())) return "";
  data.setDate(data.getDate() - limite);
  const pad = (parte: number) => String(parte).padStart(2, "0");
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}

export function grupoDebito(descricao: string) {
  const texto = descricao.toLocaleLowerCase("pt-BR");
  if (texto.includes("cota") || texto.includes("fundo de reserva")) return "Cota ordinária";
  if (texto.includes("taxa extra") || texto.includes("rateio extra") || texto.includes("limpeza de terreno")) return "Taxa extra";
  if (texto.includes("acordo") || texto.includes("honorário") || texto.includes("honorario")) return "Acordo";
  if (texto.includes("infra")) return "Multa por infração";
  return "Outros";
}

export function diasDeAtraso(vencimento: string, dataBase = hojeIso()) {
  if (!vencimento || !dataBase) return 0;
  const inicio = Date.parse(`${vencimento}T00:00:00`);
  const fim = Date.parse(`${dataBase}T00:00:00`);
  if (Number.isNaN(inicio) || Number.isNaN(fim)) return 0;
  return Math.floor((fim - inicio) / 86_400_000);
}

export function situacaoRetorno(data: string, hoje = hojeIso()) {
  if (!data) return "";
  if (data < hoje) return "atrasado" as const;
  if (data === hoje) return "hoje" as const;
  const limite = new Date(`${hoje}T00:00:00`);
  limite.setDate(limite.getDate() + 7);
  const alvo = new Date(`${data}T00:00:00`);
  if (alvo.getTime() <= limite.getTime()) return "semana" as const;
  return "agendado" as const;
}

export function retornoPendente(item: { status: string; dataProximaAcao: string }) {
  if (item.status === "Resolvido" || !item.dataProximaAcao) return false;
  const situacao = situacaoRetorno(item.dataProximaAcao);
  return situacao === "atrasado" || situacao === "hoje" || situacao === "semana";
}

export function proximoNumero(ids: number[]) {
  return ids.reduce((max, id) => Math.max(max, id), 0) + 1;
}

export function nomeCondominio(id: number) {
  return state.condominios.find((item) => item.id === id)?.nome ?? "—";
}

export function nomeUsuario(id: number | string) {
  const numeric = Number(id);
  if (!id || Number.isNaN(numeric)) return "—";
  return state.usuarios.find((item) => item.id === numeric)?.nome ?? "—";
}

export function nomeUnidade(id: number | string) {
  const numeric = Number(id);
  if (!id || Number.isNaN(numeric)) return "—";
  const unidade = state.unidades.find((item) => item.id === numeric);
  if (!unidade) return "—";
  return `${nomeCondominio(unidade.condominioId)} · ${unidade.identificacao}`;
}

export function nomeResponsavel(id: number | string) {
  const numeric = Number(id);
  if (!id || Number.isNaN(numeric)) return "—";
  return state.responsaveis.find((item) => item.id === numeric)?.nome ?? "—";
}

export function nomeCargo(id: number) {
  return state.cargos.find((item) => item.id === id)?.nome ?? "—";
}
