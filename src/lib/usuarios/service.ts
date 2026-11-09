import {
  getCadastros,
  proximoNumero,
  registrarAuditoria,
  setUsuarios,
  type Usuario,
} from "@/data/catalogo";
import {
  codigoReEmUso,
  codigoReValido,
  normalizarCodigoRe,
  reservarCodigoRe,
} from "@/lib/colaboradores/re-sequencia";
import { codigoUsuarioValido, normalizarCodigoUsuario } from "@/lib/auth/codigo";
import { hashPassword, isPasswordHash } from "@/lib/auth/password";
import {
  excluirUsuarioPg,
  identityPgDisponivel,
  listarUsuariosPg,
  upsertUsuarioPg,
} from "@/lib/db/identity-pg";
import { sincronizarCondominiosAdvogado } from "@/lib/usuarios/advogado-condominios";
import { usuarioParaResposta, type UsuarioPublico } from "@/lib/usuarios/apresentacao";

async function persistirUsuarioNoPostgres(usuario: Usuario) {
  if (!identityPgDisponivel()) {
    if (process.env.NODE_ENV === "production") {
      throw new UsuarioServiceError("PostgreSQL indisponível para gravar colaborador.", 503);
    }
    return;
  }
  const ok = await upsertUsuarioPg(usuario);
  if (!ok) {
    throw new UsuarioServiceError("Falha ao gravar colaborador no PostgreSQL.", 500);
  }
}

async function removerUsuarioDoPostgres(usuarioId: number) {
  if (!identityPgDisponivel()) {
    if (process.env.NODE_ENV === "production") {
      throw new UsuarioServiceError("PostgreSQL indisponível para excluir colaborador.", 503);
    }
    return;
  }
  const ok = await excluirUsuarioPg(usuarioId);
  if (!ok) {
    throw new UsuarioServiceError("Falha ao excluir colaborador no PostgreSQL.", 500);
  }
}

export type UsuarioInput = {
  codigo: string;
  cargoId: number;
  nome: string;
  telefone: string;
  email: string;
  senha?: string;
  /** Ignorado pelo servidor — RE é gerado automaticamente para todo colaborador. */
  codigoRe?: string;
  ativo?: boolean;
  condominioIds?: number[];
};

export class UsuarioServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function codigoDuplicado(codigo: string, editingId: number | null) {
  const chave = normalizarCodigoUsuario(codigo);
  return getCadastros().usuarios.some(
    (item) => item.id !== editingId && normalizarCodigoUsuario(item.codigo) === chave,
  );
}

function emailDuplicado(email: string, editingId: number | null) {
  return getCadastros().usuarios.some(
    (item) =>
      item.id !== editingId && item.email.localeCompare(email, "pt-BR", { sensitivity: "base" }) === 0,
  );
}

function cargoExiste(cargoId: number) {
  return getCadastros().cargos.some((item) => item.id === cargoId);
}

function usuarioEmUso(usuarioId: number) {
  const cadastros = getCadastros();
  return (
    cadastros.atendimentos.some((item) => item.usuarioId === usuarioId) ||
    cadastros.importacoes.some((item) => item.usuarioId === usuarioId) ||
    cadastros.auditoria.some((item) => item.usuarioId === String(usuarioId))
  );
}

function resolverCodigoRePersistente(
  anterior: Usuario | undefined,
  usuariosAtuais: Usuario[],
): string | undefined {
  const reAnterior = anterior?.codigoRe?.trim();
  if (reAnterior && codigoReValido(reAnterior)) {
    const normalizado = normalizarCodigoRe(reAnterior);
    if (codigoReEmUso(normalizado, usuariosAtuais, anterior?.id ?? null)) {
      throw new UsuarioServiceError("Código RE em conflito no cadastro.", 409);
    }
    return normalizado;
  }

  return undefined;
}

async function validarEntrada(
  input: UsuarioInput,
  editingId: number | null,
): Promise<Omit<Usuario, "id" | "codigoRe">> {
  const nome = input.nome.trim();
  if (!nome) {
    throw new UsuarioServiceError("Informe o nome.", 400);
  }

  const email = input.email.trim();
  let codigo = normalizarCodigoUsuario(input.codigo);
  if (!codigo) {
    const local = email.split("@")[0]?.trim() ?? "";
    codigo = normalizarCodigoUsuario(local);
  }
  if (!codigo) {
    throw new UsuarioServiceError("Informe o e-mail de acesso para gerar o login.", 400);
  }
  if (!codigoUsuarioValido(codigo)) {
    throw new UsuarioServiceError(
      "O login derivado do e-mail é inválido. Use letras, números, ponto, hífen ou sublinhado no e-mail.",
      400,
    );
  }
  if (codigoDuplicado(codigo, editingId)) {
    throw new UsuarioServiceError("Já existe um colaborador com este código de acesso.", 409);
  }

  const cargoId = input.cargoId;
  if (!Number.isFinite(cargoId) || cargoId <= 0) {
    throw new UsuarioServiceError("Selecione o cargo.", 400);
  }
  if (!cargoExiste(cargoId)) {
    throw new UsuarioServiceError("Cargo inválido.", 400);
  }

  if (!email) {
    throw new UsuarioServiceError("Informe o e-mail de acesso.", 400);
  }
  if (!emailValido(email)) {
    throw new UsuarioServiceError("Informe um e-mail válido.", 400);
  }
  if (emailDuplicado(email, editingId)) {
    throw new UsuarioServiceError("Já existe um colaborador com este e-mail.", 409);
  }

  const senhaPlain = input.senha?.trim() ?? "";
  const anterior = editingId !== null ? getCadastros().usuarios.find((item) => item.id === editingId) : undefined;

  let senha = anterior?.senha ?? "";
  if (editingId === null) {
    if (!senhaPlain) {
      throw new UsuarioServiceError("Informe a senha de acesso.", 400);
    }
    senha = isPasswordHash(senhaPlain) ? senhaPlain : await hashPassword(senhaPlain);
  } else if (senhaPlain) {
    senha = isPasswordHash(senhaPlain) ? senhaPlain : await hashPassword(senhaPlain);
  } else if (!senha || (!isPasswordHash(senha) && senha !== "definida")) {
    throw new UsuarioServiceError("Senha do colaborador inválida. Informe uma nova senha.", 400);
  }

  const ativo = input.ativo !== undefined ? Boolean(input.ativo) : (anterior?.ativo ?? true);

  return {
    codigo,
    cargoId,
    nome,
    telefone: input.telefone.trim(),
    email,
    senha,
    ativo,
  };
}

function montarUsuarioComRe(
  base: Omit<Usuario, "id" | "codigoRe">,
  usuarioId: number,
  codigoRe: string | undefined,
): Usuario {
  if (!codigoRe) return { id: usuarioId, ...base };
  const loginRe = normalizarCodigoUsuario(codigoRe);
  return { id: usuarioId, ...base, codigo: loginRe, codigoRe };
}

export async function listarUsuarios(): Promise<UsuarioPublico[]> {
  if (identityPgDisponivel()) {
    const doPg = await listarUsuariosPg();
    if (doPg) {
      setUsuarios(doPg);
      return doPg.map(usuarioParaResposta);
    }
  }
  return getCadastros().usuarios.map(usuarioParaResposta);
}

export type PerfilMinhaConta = {
  nome: string;
  email: string;
  telefone: string;
  codigoRe?: string;
  cargoNome: string;
};

/** Perfil do colaborador autenticado (somente leitura, sem permissão administrativa). */
export function obterPerfilMinhaConta(usuarioId: number): PerfilMinhaConta | null {
  const cadastros = getCadastros();
  const usuario = cadastros.usuarios.find((item) => item.id === usuarioId);
  if (!usuario) return null;
  const publico = usuarioParaResposta(usuario);
  const cargo = cadastros.cargos.find((item) => item.id === usuario.cargoId);
  return {
    nome: publico.nome,
    email: publico.email,
    telefone: publico.telefone,
    ...(publico.codigoRe ? { codigoRe: publico.codigoRe } : {}),
    cargoNome: cargo?.nome ?? "—",
  };
}

export async function criarUsuario(
  actorUserId: number,
  input: UsuarioInput,
  options?: { id?: number },
  meta?: { ip?: string; userAgent?: string },
): Promise<UsuarioPublico> {
  const base = await validarEntrada(input, null);

  let nextId = options?.id;
  if (nextId !== undefined) {
    if (!Number.isFinite(nextId) || nextId <= 0) {
      throw new UsuarioServiceError("Identificador do colaborador inválido.", 400);
    }
    if (getCadastros().usuarios.some((item) => item.id === nextId)) {
      throw new UsuarioServiceError("Já existe um colaborador com este identificador interno.", 409);
    }
  } else {
    nextId = proximoNumero(getCadastros().usuarios.map((item) => item.id));
  }

  const usuariosAtuais = getCadastros().usuarios;
  const reExistente = resolverCodigoRePersistente(undefined, usuariosAtuais);

  let usuario: Usuario;

  if (!reExistente) {
    usuario = await reservarCodigoRe(usuariosAtuais, (codigoRe) => {
      const criado = montarUsuarioComRe(base, nextId!, codigoRe);
      setUsuarios((current) => [...current, criado]);
      return criado;
    });
  } else {
    usuario = montarUsuarioComRe(base, nextId, reExistente);
    setUsuarios((current) => [...current, usuario]);
  }

  await persistirUsuarioNoPostgres(usuario);

  if (input.condominioIds) {
    sincronizarCondominiosAdvogado(
      actorUserId,
      usuario.id,
      usuario.cargoId,
      usuario.nome,
      input.condominioIds,
      meta,
    );
  }

  registrarAuditoria(
    {
      entidade: "user",
      registroId: String(nextId),
      acao: "INSERT",
      dadosAnteriores: "",
      dadosNovos: usuario.codigoRe ? `${usuario.codigoRe} · ${usuario.nome}` : usuario.nome,
      camposAlterados: usuario.codigoRe ? "codigo, nome, cargo_id, email, codigo_re" : "codigo, nome, cargo_id, email",
    },
    actorUserId,
    meta,
  );
  return usuarioParaResposta(usuario);
}

export async function atualizarUsuario(
  actorUserId: number,
  usuarioId: number,
  input: UsuarioInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<UsuarioPublico> {
  const atual = getCadastros().usuarios.find((item) => item.id === usuarioId);
  if (!atual) {
    throw new UsuarioServiceError("Colaborador não encontrado.", 404);
  }

  const base = await validarEntrada(input, usuarioId);
  const usuariosAtuais = getCadastros().usuarios.filter((item) => item.id !== usuarioId);
  const codigoRe = resolverCodigoRePersistente(atual, usuariosAtuais);

  let atualizado: Usuario;

  if (!codigoRe) {
    atualizado = await reservarCodigoRe(getCadastros().usuarios, (novoRe) => {
      const next = montarUsuarioComRe(base, usuarioId, novoRe);
      setUsuarios((current) => current.map((item) => (item.id === usuarioId ? next : item)));
      return next;
    });
  } else {
    atualizado = montarUsuarioComRe(base, usuarioId, codigoRe);
    setUsuarios((current) => current.map((item) => (item.id === usuarioId ? atualizado : item)));
  }

  await persistirUsuarioNoPostgres(atualizado);

  if (input.condominioIds) {
    sincronizarCondominiosAdvogado(
      actorUserId,
      usuarioId,
      atualizado.cargoId,
      atualizado.nome,
      input.condominioIds,
      meta,
    );
  }

  registrarAuditoria(
    {
      entidade: "user",
      registroId: String(usuarioId),
      acao: "UPDATE",
      dadosAnteriores: atual.codigoRe ?? atual.nome,
      dadosNovos: atualizado.codigoRe ?? atualizado.nome,
      camposAlterados: input.senha?.trim()
        ? "codigo, nome, cargo_id, email, credencial_acesso, ativo"
        : "codigo, nome, cargo_id, email, ativo",
    },
    actorUserId,
    meta,
  );
  return usuarioParaResposta(atualizado);
}

export async function alterarSituacaoUsuario(
  actorUserId: number,
  usuarioId: number,
  ativo: boolean,
  meta?: { ip?: string; userAgent?: string },
): Promise<UsuarioPublico> {
  const atual = getCadastros().usuarios.find((item) => item.id === usuarioId);
  if (!atual) {
    throw new UsuarioServiceError("Colaborador não encontrado.", 404);
  }
  if (atual.ativo === ativo) {
    return usuarioParaResposta(atual);
  }

  const atualizado: Usuario = { ...atual, ativo };
  setUsuarios((current) => current.map((item) => (item.id === usuarioId ? atualizado : item)));
  await persistirUsuarioNoPostgres(atualizado);

  registrarAuditoria(
    {
      entidade: "user",
      registroId: String(usuarioId),
      acao: "UPDATE",
      dadosAnteriores: atual.ativo === false ? "Inativo" : "Ativo",
      dadosNovos: ativo ? "Ativo" : "Inativo",
      camposAlterados: "ativo",
    },
    actorUserId,
    meta,
  );
  return usuarioParaResposta(atualizado);
}

export async function excluirUsuario(
  actorUserId: number,
  usuarioId: number,
  meta?: { ip?: string; userAgent?: string },
) {
  const atual = getCadastros().usuarios.find((item) => item.id === usuarioId);
  if (!atual) {
    throw new UsuarioServiceError("Colaborador não encontrado.", 404);
  }
  if (usuarioEmUso(usuarioId)) {
    throw new UsuarioServiceError(
      "Existem atendimentos, importações ou auditoria ligados a esta pessoa.",
      409,
    );
  }

  await removerUsuarioDoPostgres(usuarioId);
  setUsuarios((current) => current.filter((item) => item.id !== usuarioId));
  registrarAuditoria(
    {
      entidade: "user",
      registroId: String(usuarioId),
      acao: "DELETE",
      dadosAnteriores: atual.nome,
      dadosNovos: "",
      camposAlterados: "nome",
    },
    actorUserId,
    meta,
  );
}

export function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}
