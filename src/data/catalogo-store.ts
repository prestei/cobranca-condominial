import "server-only";

import { sanitizarCamposAlterados, sanitizarTextoAuditoria } from "@/lib/auditoria/sanitize";
import { normalizarCodigoUsuario } from "@/lib/auth/codigo";
import { getUsuarioLogadoIdOrNull } from "@/lib/auth/usuario-logado";
import {
  agoraIso,
  ID_USUARIO_SESSAO,
  snapshotCadastrosParaTestes,
  usuariosLoginLegado,
  type AtribuicaoCobranca,
  type Atendimento,
  type Auditoria,
  type Cadastros,
  type Cargo,
  type Condominio,
  type Debito,
  type DocumentoJuridico,
  type EncaminhamentoJuridico,
  type Importacao,
  type NotificacaoFalha,
  type NotificacaoInterna,
  type PagamentoAcordo,
  type ParcelaAcordo,
  type PropostaNegociacao,
  type Responsavel,
  type Unidade,
  type Usuario,
  type Vinculo,
} from "@/data/catalogo";
import {
  enableTestCatalog,
  getRequestCatalog,
  mutateRequestCatalog,
  tryGetRequestCatalog,
} from "@/lib/db/request-catalog";

function usuarioCorrespondeAoLogin(item: Usuario, chave: string) {
  if (item.ativo === false) return false;
  if (normalizarCodigoUsuario(item.codigo) === chave) return true;
  const re = item.codigoRe?.trim();
  return Boolean(re && normalizarCodigoUsuario(re) === chave);
}

/** Lê o catálogo do escopo de requisição (importação) ou do modo teste. */
export function getCadastros(): Cadastros {
  return getRequestCatalog();
}

/** Login legado (sem PG): lê do escopo de teste. Com DATABASE_URL use repositório de identidade. */
export function buscarUsuarioPorCodigoLogin(codigo: string) {
  const chave = normalizarCodigoUsuario(codigo);
  if (!chave) return undefined;
  const cadastros = tryGetRequestCatalog();
  const noEstado = cadastros?.usuarios.find((item) => usuarioCorrespondeAoLogin(item, chave));
  if (noEstado) return noEstado;
  if (process.env.DATABASE_URL?.trim()) return undefined;
  return usuariosLoginLegado().find((item) => usuarioCorrespondeAoLogin(item, chave));
}

function atualizar<K extends keyof Cadastros>(key: K, next: Cadastros[K] | ((current: Cadastros[K]) => Cadastros[K])) {
  const store = getRequestCatalog();
  const value = typeof next === "function" ? (next as (c: Cadastros[K]) => Cadastros[K])(store[key]) : next;
  if (value !== store[key]) {
    store[key] = value;
  }
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

export function setEncaminhamentosJuridicos(
  next: EncaminhamentoJuridico[] | ((current: EncaminhamentoJuridico[]) => EncaminhamentoJuridico[]),
) {
  atualizar("encaminhamentosJuridicos", next);
}

export function setDocumentosJuridicos(
  next: DocumentoJuridico[] | ((current: DocumentoJuridico[]) => DocumentoJuridico[]),
) {
  atualizar("documentosJuridicos", next);
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

/** Somente leitura/sincronização na UI — eventos são append-only via `registrarAuditoria` no servidor. */
export function setAuditoria(next: Auditoria[] | ((current: Auditoria[]) => Auditoria[])) {
  atualizar("auditoria", next);
}

export function setNotificacoesInternas(
  next: NotificacaoInterna[] | ((current: NotificacaoInterna[]) => NotificacaoInterna[]),
) {
  atualizar("notificacoesInternas", next);
}

export function setNotificacaoFalhas(
  next: NotificacaoFalha[] | ((current: NotificacaoFalha[]) => NotificacaoFalha[]),
) {
  atualizar("notificacaoFalhas", next);
}

/** Restaura o catálogo ao seed inicial — uso exclusivo em testes automatizados. */
export function resetCadastrosParaTestes() {
  enableTestCatalog(snapshotCadastrosParaTestes());
}

/** Mutações atômicas no escopo de catálogo da requisição (importação). */
export function executarTransacaoCatalogo<T>(fn: () => T): T {
  const snapshot = structuredClone(getRequestCatalog());
  try {
    return fn();
  } catch (error) {
    mutateRequestCatalog(() => snapshot);
    throw error;
  }
}

/** Variante assíncrona de {@link executarTransacaoCatalogo}. */
export async function executarTransacaoCatalogoAsync<T>(fn: () => Promise<T>): Promise<T> {
  const snapshot = structuredClone(getRequestCatalog());
  try {
    return await fn();
  } catch (error) {
    mutateRequestCatalog(() => snapshot);
    throw error;
  }
}

export function registrarAuditoria(
  entry: Pick<Auditoria, "entidade" | "registroId" | "acao" | "dadosAnteriores" | "dadosNovos" | "camposAlterados">,
  usuarioId?: number,
  meta?: { ip?: string; userAgent?: string },
) {
  mutateRequestCatalog((state) => {
    const registro: Auditoria = {
      id: state.auditoria.reduce((max, item) => Math.max(max, item.id), 0) + 1,
      usuarioId: String(usuarioId ?? getUsuarioLogadoIdOrNull() ?? ID_USUARIO_SESSAO),
      ip: meta?.ip ?? "",
      userAgent: meta?.userAgent ?? "",
      dataHora: agoraIso(),
      entidade: entry.entidade,
      registroId: entry.registroId,
      acao: entry.acao,
      dadosAnteriores: sanitizarTextoAuditoria(entry.dadosAnteriores),
      dadosNovos: sanitizarTextoAuditoria(entry.dadosNovos),
      camposAlterados: sanitizarCamposAlterados(entry.camposAlterados),
    };
    state.auditoria = [registro, ...state.auditoria];
  });
}
