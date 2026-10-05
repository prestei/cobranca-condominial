export const advogados = ["Dra. Thamires", "Dra. Jullyane", "Dr. João"] as const;

const carteiraInicial: Array<[string, (typeof advogados)[number]]> = [
  ["Francisca Perea", "Dra. Thamires"],
  ["Jardins do Vale", "Dra. Thamires"],
  ["Parque dos Pássaros", "Dra. Thamires"],
  ["Residencial do Mar", "Dra. Thamires"],
  ["Acqua Ville", "Dra. Thamires"],
  ["Azaleias", "Dra. Thamires"],
  ["Reserva Sim", "Dra. Thamires"],
  ["Moradas Ville", "Dra. Thamires"],
  ["Mariglória", "Dra. Thamires"],
  ["Madrid", "Dra. Thamires"],
  ["Solar Ondina", "Dra. Thamires"],
  ["Lisboa", "Dra. Thamires"],
  ["Salvador Life III", "Dra. Thamires"],
  ["Ideale", "Dra. Jullyane"],
  ["Floratta", "Dra. Jullyane"],
  ["Gardênia", "Dra. Jullyane"],
  ["Arbol", "Dra. Jullyane"],
  ["Parque das Orquídeas", "Dra. Jullyane"],
  ["Solar das Mangueiras", "Dra. Jullyane"],
  ["Casas de Turim", "Dra. Jullyane"],
  ["Reserva Humaitá", "Dra. Jullyane"],
  ["Esplanada do Sol", "Dra. Jullyane"],
  ["Moradas do Parque II", "Dra. Jullyane"],
  ["Morada Imperial", "Dra. Jullyane"],
  ["Alameda das Flores", "Dra. Jullyane"],
  ["Green Village", "Dra. Jullyane"],
  ["Quintas do Sol I", "Dra. Jullyane"],
  ["Recanto dos Pássaros", "Dra. Jullyane"],
  ["Pedra de Aleluia", "Dr. João"],
  ["Santa Brígida", "Dr. João"],
  ["Villa Vina", "Dr. João"],
  ["Itapema", "Dr. João"],
  ["Vila Rica", "Dr. João"],
  ["Principado de Mônaco", "Dr. João"],
  ["Victória", "Dr. João"],
];

export type Condominio = {
  id: number;
  nome: string;
  advogado: string;
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
  cargoId: number;
  nome: string;
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

const condominioVazio: Omit<Condominio, "id" | "nome" | "advogado"> = {
  administradora: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  cidade: "",
  estado: "",
  observacao: "",
};

const cidadeInicial: Record<string, string> = {
  Azaleias: "Salvador",
  Ideale: "Lauro de Freitas",
};

function criarCondominios(): Condominio[] {
  return carteiraInicial.map(([nome, advogado], index) => ({
    id: index + 1,
    nome,
    advogado,
    ...condominioVazio,
    cidade: cidadeInicial[nome] ?? "",
  }));
}

const cargosIniciais: Cargo[] = [
  {
    id: 1,
    nome: "Administrador",
    descricao: "Cadastros, relatórios, exportações e correção de registros.",
    permissaoJson: '{"cadastros":true,"relatorios":true,"exportacoes":true,"correcoes":true,"auditoria":true}',
  },
  {
    id: 2,
    nome: "Atendente",
    descricao: "Registra atendimentos e acompanha os próprios retornos.",
    permissaoJson: '{"atendimentos":true,"retornos":true}',
  },
  {
    id: 3,
    nome: "Advogado",
    descricao: "Consulta relatórios e o histórico dos condomínios sob sua responsabilidade.",
    permissaoJson: '{"relatorios":true,"historico":true}',
  },
];

const usuariosIniciais: Usuario[] = [
  { id: 1, cargoId: 1, nome: "Milena", telefone: "71999990001", email: "milena@escritorio.example", senha: "definida" },
  { id: 2, cargoId: 2, nome: "Raquel", telefone: "71999990002", email: "raquel@escritorio.example", senha: "definida" },
  { id: 3, cargoId: 2, nome: "Tássia", telefone: "71999990003", email: "tassia@escritorio.example", senha: "definida" },
  { id: 4, cargoId: 2, nome: "Atendente 3", telefone: "", email: "atendente3@escritorio.example", senha: "definida" },
  { id: 5, cargoId: 3, nome: "Dra. Adryelle", telefone: "71999990005", email: "adryelle@escritorio.example", senha: "definida" },
];

const unidadesIniciais: Unidade[] = [
  { id: 1, condominioId: 6, identificacao: "101", bloco: "A", tipo: "Apartamento", status: "Ativa" },
  { id: 2, condominioId: 6, identificacao: "102", bloco: "A", tipo: "Apartamento", status: "Ativa" },
  { id: 3, condominioId: 6, identificacao: "201", bloco: "B", tipo: "Apartamento", status: "Inativa" },
  { id: 4, condominioId: 14, identificacao: "B-203", bloco: "B", tipo: "Apartamento", status: "Ativa" },
  { id: 5, condominioId: 26, identificacao: "Sala 3", bloco: "Torre 1", tipo: "Sala", status: "Ativa" },
  { id: 6, condominioId: 29, identificacao: "12", bloco: "", tipo: "Casa", status: "Ativa" },
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
    condominioId: 6,
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
    condominioId: 6,
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
    condominioId: 14,
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
    condominioId: 6,
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
    condominioId: 6,
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
    condominioId: 26,
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
    condominioId: 29,
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
    condominioId: 6,
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
  condominios: criarCondominios(),
  cargos: cargosIniciais,
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

export function getCadastros() {
  return state;
}

function atualizar<K extends keyof Cadastros>(key: K, next: Cadastros[K] | ((current: Cadastros[K]) => Cadastros[K])) {
  const value = typeof next === "function" ? next(state[key]) : next;
  state = { ...state, [key]: value };
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

export function registrarAuditoria(entry: Pick<Auditoria, "entidade" | "registroId" | "acao" | "dadosAnteriores" | "dadosNovos" | "camposAlterados">) {
  const registro: Auditoria = {
    id: state.auditoria.reduce((max, item) => Math.max(max, item.id), 0) + 1,
    usuarioId: "1",
    ip: "",
    userAgent: "",
    dataHora: agoraIso(),
    ...entry,
  };
  state = { ...state, auditoria: [registro, ...state.auditoria] };
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

export function debitoEmAberto(item: { status: string }) {
  return item.status === "Pendente" || item.status === "Vencido";
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
