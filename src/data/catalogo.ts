import { getUsuarioLogadoIdOrNull } from "@/lib/auth/usuario-logado";
import { normalizarCodigoUsuario } from "@/lib/auth/codigo";
import { temPermissao } from "@/lib/permissions/check";
import {
  PERMISSAO_JSON_ADMIN,
  PERMISSAO_JSON_ADVOGADO,
  PERMISSAO_JSON_ATENDENTE,
} from "@/lib/permissions/seeds";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";
import {
  atribuicoesBaseTeste,
  condominiosBaseTeste,
  debitosBaseTeste,
  responsaveisBaseTeste,
  unidadesBaseTeste,
  vinculosBaseTeste,
} from "@/data/seed-base-teste";

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
  /** RE operacional (atendentes). */
  codigoRe?: string;
  cargoId: number;
  nome: string;
  telefone: string;
  email: string;
  senha: string;
};

export type AtribuicaoCobranca = {
  id: number;
  unidadeId: number;
  atendenteId: number;
  atribuidoPorId: number;
  atribuidoEm: string;
  encerradoEm: string | null;
  motivo: string;
  anteriorAtendenteId: number | null;
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

/** `origem` = valores vindos da administradora/importação; `manual` = correção cadastrada no sistema (sem recálculo automático). */
export type FonteValoresDebito = "origem" | "manual";

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
  /** ISO — última persistência (importação ou correção manual). */
  atualizadoEm: string;
  fonteValores: FonteValoresDebito;
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
  /** Preenchido ao marcar o retorno agendado como realizado (preserva data_proxima_acao original). */
  retornoConcluidoEm: string;
  retornoConcluidoPorId: number | null;
};

/** Proposta de negociação (T15) — não equivale a pagamento recebido. */
export type PropostaNegociacao = {
  id: string;
  condominioId: number;
  unidadeId: number;
  usuarioId: number;
  criadoEm: string;
  status: string;
  valorProposto: string;
  observacoes: string;
  debitoIds: number[];
  /** Preenchido quando status = Aceita (acordo confirmado). */
  acordoConfirmadoEm: string;
  acordoConfirmadoPorId: number | null;
  termosAprovados: string;
};

/** Parcela de acordo confirmado (T16) — valor previsto, não equivale a recebimento. */
export type ParcelaAcordo = {
  id: string;
  propostaId: string;
  condominioId: number;
  unidadeId: number;
  numero: number;
  valorPrevisto: string;
  /** Data de vencimento (YYYY-MM-DD). */
  vencimentoEm: string;
  criadoEm: string;
  criadoPorId: number;
};

/** Pagamento vinculado a parcela de acordo (T16). */
export type PagamentoAcordo = {
  id: string;
  propostaId: string;
  parcelaId: string;
  unidadeId: number;
  valor: string;
  /** Data informada do pagamento (ISO). */
  dataPagamento: string;
  referenciaComprovante: string;
  /** Informado = relato operacional; Confirmado = conferência interna (fonte oficial a definir). */
  confirmacao: string;
  criadoEm: string;
  registradoPorId: number;
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
export const statusPropostaNegociacao = ["Em análise", "Aceita", "Recusada", "Cancelada"] as const;
export const confirmacaoPagamentoAcordo = ["Informado", "Confirmado"] as const;
export const statusParcelaAcordo = ["Prevista", "Vencida", "Quitada"] as const;
export const tiposImportacao = ["debitos", "responsaveis", "unidades"] as const;
export const statusImportacao = ["Processando", "Concluida", "Erro", "Cancelada"] as const;
export const acoesAuditoria = ["INSERT", "UPDATE", "DELETE"] as const;

const condominiosIniciais: Condominio[] = condominiosBaseTeste;

const cargosIniciais: Cargo[] = [
  {
    id: 1,
    nome: "Administrador",
    descricao: "Cadastros, relatórios, exportações e correção de registros.",
    permissaoJson: PERMISSAO_JSON_ADMIN,
  },
  {
    id: 2,
    nome: "Atendente",
    descricao: "Registra atendimentos e acompanha os próprios retornos.",
    permissaoJson: PERMISSAO_JSON_ATENDENTE,
  },
  {
    id: 3,
    nome: "Advogado",
    descricao: "Consulta relatórios e o histórico dos condomínios sob sua responsabilidade.",
    permissaoJson: PERMISSAO_JSON_ADVOGADO,
  },
];

/** bcrypt de `12345` — senha padrão de demonstração (ver SENHA_DEMONSTRACAO). */
const SENHA_INICIAL_HASH = "$2b$12$i28E0e.k2Ld.FSrys.myW.0bPQ/a9quiTz07iVchW67QFbPQN1gie";
const SENHA_TESTE_HASH = SENHA_INICIAL_HASH;

const usuariosIniciais: Usuario[] = [
  { id: 1, codigo: "MILENA", cargoId: 1, nome: "Milena", telefone: "71999990001", email: "milena@escritorio.example", senha: SENHA_INICIAL_HASH },
  { id: 2, codigo: "RAQUEL", codigoRe: "RE-001", cargoId: 2, nome: "Raquel", telefone: "71999990002", email: "raquel@escritorio.example", senha: SENHA_INICIAL_HASH },
  { id: 3, codigo: "TASSIA", codigoRe: "RE-002", cargoId: 2, nome: "Tássia", telefone: "71999990003", email: "tassia@escritorio.example", senha: SENHA_INICIAL_HASH },
  { id: 4, codigo: "ATD003", codigoRe: "RE-003", cargoId: 2, nome: "Atendente 3", telefone: "", email: "atendente3@escritorio.example", senha: SENHA_INICIAL_HASH },
  { id: 5, codigo: "ADRYELLE", cargoId: 3, nome: "Dra. Adryelle", telefone: "71999990005", email: "adryelle@escritorio.example", senha: SENHA_INICIAL_HASH },
  {
    id: 6,
    codigo: "12345",
    cargoId: 1,
    nome: "Usuário Teste",
    telefone: "",
    email: "teste@escritorio.example",
    senha: SENHA_TESTE_HASH,
  },
];

const atribuicoesIniciais: AtribuicaoCobranca[] = atribuicoesBaseTeste;

const unidadesIniciais: Unidade[] = unidadesBaseTeste;

const responsaveisIniciais: Responsavel[] = responsaveisBaseTeste;

const vinculosIniciais: Vinculo[] = vinculosBaseTeste;

const debitosIniciais: Debito[] = debitosBaseTeste;

const atendimentosIniciais: Atendimento[] = [];

const propostasNegociacaoIniciais: PropostaNegociacao[] = [];

const parcelasAcordoIniciais: ParcelaAcordo[] = [];

const pagamentosAcordoIniciais: PagamentoAcordo[] = [];

const importacoesIniciais: Importacao[] = [];

const auditoriaInicial: Auditoria[] = [];

type Cadastros = {
  condominios: Condominio[];
  cargos: Cargo[];
  usuarios: Usuario[];
  unidades: Unidade[];
  responsaveis: Responsavel[];
  vinculos: Vinculo[];
  debitos: Debito[];
  atendimentos: Atendimento[];
  propostasNegociacao: PropostaNegociacao[];
  parcelasAcordo: ParcelaAcordo[];
  pagamentosAcordo: PagamentoAcordo[];
  atribuicoesCobranca: AtribuicaoCobranca[];
  importacoes: Importacao[];
  auditoria: Auditoria[];
};

let state: Cadastros = {
  condominios: condominiosIniciais,
  cargos: cargosIniciais,
  usuarios: usuariosIniciais,
  unidades: unidadesIniciais,
  responsaveis: responsaveisIniciais,
  vinculos: vinculosIniciais,
  debitos: debitosIniciais,
  atendimentos: atendimentosIniciais,
  propostasNegociacao: propostasNegociacaoIniciais,
  parcelasAcordo: parcelasAcordoIniciais,
  pagamentosAcordo: pagamentosAcordoIniciais,
  atribuicoesCobranca: atribuicoesIniciais,
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

/** Login: seed do servidor tem precedência (senha bcrypt correta no deploy / após alteração do seed). */
export function buscarUsuarioPorCodigoLogin(codigo: string) {
  const chave = normalizarCodigoUsuario(codigo);
  if (!chave) return undefined;
  const seed = usuariosIniciais.find((item) => normalizarCodigoUsuario(item.codigo) === chave);
  if (seed) return seed;
  return state.usuarios.find((item) => normalizarCodigoUsuario(item.codigo) === chave);
}

function atualizar<K extends keyof Cadastros>(key: K, next: Cadastros[K] | ((current: Cadastros[K]) => Cadastros[K])) {
  const value = typeof next === "function" ? next(state[key]) : next;
  if (value === state[key]) return;
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

export function setPropostasNegociacao(
  next: PropostaNegociacao[] | ((current: PropostaNegociacao[]) => PropostaNegociacao[]),
) {
  atualizar("propostasNegociacao", next);
}

export function setParcelasAcordo(next: ParcelaAcordo[] | ((current: ParcelaAcordo[]) => ParcelaAcordo[])) {
  atualizar("parcelasAcordo", next);
}

export function setPagamentosAcordo(
  next: PagamentoAcordo[] | ((current: PagamentoAcordo[]) => PagamentoAcordo[]),
) {
  atualizar("pagamentosAcordo", next);
}

export function setAtribuicoesCobranca(
  next: AtribuicaoCobranca[] | ((current: AtribuicaoCobranca[]) => AtribuicaoCobranca[]),
) {
  atualizar("atribuicoesCobranca", next);
}

export function setImportacoes(next: Importacao[] | ((current: Importacao[]) => Importacao[])) {
  atualizar("importacoes", next);
}

export function setAuditoria(next: Auditoria[] | ((current: Auditoria[]) => Auditoria[])) {
  atualizar("auditoria", next);
}

export function registrarAuditoria(
  entry: Pick<Auditoria, "entidade" | "registroId" | "acao" | "dadosAnteriores" | "dadosNovos" | "camposAlterados">,
  usuarioId?: number,
  meta?: { ip?: string; userAgent?: string },
) {
  const registro: Auditoria = {
    id: state.auditoria.reduce((max, item) => Math.max(max, item.id), 0) + 1,
    usuarioId: String(usuarioId ?? getUsuarioLogadoIdOrNull() ?? ID_USUARIO_SESSAO),
    ip: meta?.ip ?? "",
    userAgent: meta?.userAgent ?? "",
    dataHora: agoraIso(),
    ...entry,
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

export function retornoPendente(item: {
  status: string;
  dataProximaAcao: string;
  retornoConcluidoEm?: string;
}) {
  if (item.retornoConcluidoEm?.trim()) return false;
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
