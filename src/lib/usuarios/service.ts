import { Usuario } from "@/data/catalogo";
import {
  codigoReEmUso,
  codigoReValido,
  normalizarCodigoRe,
  reservarCodigoRe,
} from "@/lib/colaboradores/re-sequencia";
import { codigoUsuarioValido, normalizarCodigoUsuario } from "@/lib/auth/codigo";
import { hashPassword, isPasswordHash } from "@/lib/auth/password";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import {
  deleteUser,
  findUserById,
  listRoles,
  listUsers,
  nextUserId,
  upsertUser,
  userIsReferenced,
} from "@/lib/db/repositories/identity-repository";
import { sincronizarCondominiosAdvogado } from "@/lib/usuarios/advogado-condominios";
import { usuarioParaResposta, type UsuarioPublico } from "@/lib/usuarios/apresentacao";

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

function codigoDuplicado(codigo: string, editingId: number | null, usuarios: Usuario[]) {
  const chave = normalizarCodigoUsuario(codigo);
  return usuarios.some(
    (item) => item.id !== editingId && normalizarCodigoUsuario(item.codigo) === chave,
  );
}

function emailDuplicado(email: string, editingId: number | null, usuarios: Usuario[]) {
  return usuarios.some(
    (item) =>
      item.id !== editingId && item.email.localeCompare(email, "pt-BR", { sensitivity: "base" }) === 0,
  );
}

function cargoExiste(cargoId: number, cargos: { id: number }[]) {
  return cargos.some((item) => item.id === cargoId);
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
  const [usuarios, cargos] = await Promise.all([listUsers(), listRoles()]);

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
  if (codigoDuplicado(codigo, editingId, usuarios)) {
    throw new UsuarioServiceError("Já existe um colaborador com este código de acesso.", 409);
  }

  const cargoId = input.cargoId;
  if (!Number.isFinite(cargoId) || cargoId <= 0) {
    throw new UsuarioServiceError("Selecione o cargo.", 400);
  }
  if (!cargoExiste(cargoId, cargos)) {
    throw new UsuarioServiceError("Cargo inválido.", 400);
  }

  if (!email) {
    throw new UsuarioServiceError("Informe o e-mail de acesso.", 400);
  }
  if (!emailValido(email)) {
    throw new UsuarioServiceError("Informe um e-mail válido.", 400);
  }
  if (emailDuplicado(email, editingId, usuarios)) {
    throw new UsuarioServiceError("Já existe um colaborador com este e-mail.", 409);
  }

  const senhaPlain = input.senha?.trim() ?? "";
  const anterior = editingId !== null ? usuarios.find((item) => item.id === editingId) : undefined;

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
  const usuarios = await listUsers();
  return usuarios.map(usuarioParaResposta);
}

export type PerfilMinhaConta = {
  nome: string;
  email: string;
  telefone: string;
  codigoRe?: string;
  cargoNome: string;
};

/** Perfil do colaborador autenticado (somente leitura, sem permissão administrativa). */
export async function obterPerfilMinhaConta(usuarioId: number): Promise<PerfilMinhaConta | null> {
  const usuario = await findUserById(usuarioId);
  if (!usuario) return null;
  const publico = usuarioParaResposta(usuario);
  const cargos = await listRoles();
  const cargo = cargos.find((item) => item.id === usuario.cargoId);
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
  const usuariosAtuais = await listUsers();

  let nextId = options?.id;
  if (nextId !== undefined) {
    if (!Number.isFinite(nextId) || nextId <= 0) {
      throw new UsuarioServiceError("Identificador do colaborador inválido.", 400);
    }
    if (usuariosAtuais.some((item) => item.id === nextId)) {
      throw new UsuarioServiceError("Já existe um colaborador com este identificador interno.", 409);
    }
  } else {
    nextId = await nextUserId();
  }

  const reExistente = resolverCodigoRePersistente(undefined, usuariosAtuais);

  let usuario: Usuario;

  if (!reExistente) {
    usuario = await reservarCodigoRe(usuariosAtuais, async (codigoRe) => {
      const criado = montarUsuarioComRe(base, nextId!, codigoRe);
      return upsertUser(criado);
    });
  } else {
    const criado = montarUsuarioComRe(base, nextId, reExistente);
    usuario = await upsertUser(criado);
  }

  if (input.condominioIds) {
    await sincronizarCondominiosAdvogado(
      actorUserId,
      usuario.id,
      usuario.cargoId,
      usuario.nome,
      input.condominioIds,
      meta,
    );
  }

  await writeAuditLog({
    entity: "user",
    recordId: String(nextId),
    action: "INSERT",
    previousData: "",
    newData: usuario.codigoRe ? `${usuario.codigoRe} · ${usuario.nome}` : usuario.nome,
    changedFields: usuario.codigoRe ? "codigo, nome, cargo_id, email, codigo_re" : "codigo, nome, cargo_id, email",
    userId: actorUserId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return usuarioParaResposta(usuario);
}

export async function atualizarUsuario(
  actorUserId: number,
  usuarioId: number,
  input: UsuarioInput,
  meta?: { ip?: string; userAgent?: string },
): Promise<UsuarioPublico> {
  const atual = await findUserById(usuarioId);
  if (!atual) {
    throw new UsuarioServiceError("Colaborador não encontrado.", 404);
  }

  const base = await validarEntrada(input, usuarioId);
  const usuarios = await listUsers();
  const usuariosSemAtual = usuarios.filter((item) => item.id !== usuarioId);
  const codigoRe = resolverCodigoRePersistente(atual, usuariosSemAtual);

  let atualizado: Usuario;

  if (!codigoRe) {
    atualizado = await reservarCodigoRe(usuarios, async (novoRe) => {
      const next = montarUsuarioComRe(base, usuarioId, novoRe);
      return upsertUser(next);
    });
  } else {
    const next = montarUsuarioComRe(base, usuarioId, codigoRe);
    atualizado = await upsertUser(next);
  }

  if (input.condominioIds) {
    await sincronizarCondominiosAdvogado(
      actorUserId,
      usuarioId,
      atualizado.cargoId,
      atualizado.nome,
      input.condominioIds,
      meta,
    );
  }

  await writeAuditLog({
    entity: "user",
    recordId: String(usuarioId),
    action: "UPDATE",
    previousData: atual.codigoRe ?? atual.nome,
    newData: atualizado.codigoRe ?? atualizado.nome,
    changedFields: input.senha?.trim()
      ? "codigo, nome, cargo_id, email, credencial_acesso, ativo"
      : "codigo, nome, cargo_id, email, ativo",
    userId: actorUserId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return usuarioParaResposta(atualizado);
}

export async function alterarSituacaoUsuario(
  actorUserId: number,
  usuarioId: number,
  ativo: boolean,
  meta?: { ip?: string; userAgent?: string },
): Promise<UsuarioPublico> {
  const atual = await findUserById(usuarioId);
  if (!atual) {
    throw new UsuarioServiceError("Colaborador não encontrado.", 404);
  }
  if (atual.ativo === ativo) {
    return usuarioParaResposta(atual);
  }

  const atualizado: Usuario = { ...atual, ativo };
  const gravado = await upsertUser(atualizado);

  await writeAuditLog({
    entity: "user",
    recordId: String(usuarioId),
    action: "UPDATE",
    previousData: atual.ativo === false ? "Inativo" : "Ativo",
    newData: ativo ? "Ativo" : "Inativo",
    changedFields: "ativo",
    userId: actorUserId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  return usuarioParaResposta(gravado);
}

export async function excluirUsuario(
  actorUserId: number,
  usuarioId: number,
  meta?: { ip?: string; userAgent?: string },
) {
  const atual = await findUserById(usuarioId);
  if (!atual) {
    throw new UsuarioServiceError("Colaborador não encontrado.", 404);
  }
  if (await userIsReferenced(usuarioId)) {
    throw new UsuarioServiceError(
      "Existem atendimentos, importações ou auditoria ligados a esta pessoa.",
      409,
    );
  }

  await deleteUser(usuarioId);
  await writeAuditLog({
    entity: "user",
    recordId: String(usuarioId),
    action: "DELETE",
    previousData: atual.nome,
    newData: "",
    changedFields: "nome",
    userId: actorUserId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
}

export function requestMeta(request: Request) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}
