import {
  getCadastros,
  proximoNumero,
  registrarAuditoria,
  setUsuarios,
  type Usuario,
} from "@/data/catalogo";
import { codigoUsuarioValido, normalizarCodigoUsuario } from "@/lib/auth/codigo";
import { hashPassword, isPasswordHash } from "@/lib/auth/password";
import { usuarioParaResposta, type UsuarioPublico } from "@/lib/usuarios/apresentacao";

export type UsuarioInput = {
  codigo: string;
  cargoId: number;
  nome: string;
  telefone: string;
  email: string;
  senha?: string;
  codigoRe?: string;
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

async function validarEntrada(input: UsuarioInput, editingId: number | null): Promise<Omit<Usuario, "id">> {
  const nome = input.nome.trim();
  if (!nome) {
    throw new UsuarioServiceError("Informe o nome.", 400);
  }

  const codigo = normalizarCodigoUsuario(input.codigo);
  if (!codigo) {
    throw new UsuarioServiceError("Informe o código de login.", 400);
  }
  if (!codigoUsuarioValido(codigo)) {
    throw new UsuarioServiceError(
      "Use de 2 a 32 caracteres (letras, números, ponto, hífen ou sublinhado).",
      400,
    );
  }
  if (codigoDuplicado(codigo, editingId)) {
    throw new UsuarioServiceError("Já existe um colaborador com este código.", 409);
  }

  const cargoId = input.cargoId;
  if (!Number.isFinite(cargoId) || cargoId <= 0) {
    throw new UsuarioServiceError("Selecione o cargo.", 400);
  }
  if (!cargoExiste(cargoId)) {
    throw new UsuarioServiceError("Cargo inválido.", 400);
  }

  const email = input.email.trim();
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

  const codigoRe = input.codigoRe?.trim();
  return {
    codigo,
    cargoId,
    nome,
    telefone: input.telefone.trim(),
    email,
    senha,
    ...(codigoRe ? { codigoRe } : anterior?.codigoRe ? { codigoRe: anterior.codigoRe } : {}),
  };
}

export function listarUsuarios(): UsuarioPublico[] {
  return getCadastros().usuarios.map(usuarioParaResposta);
}

export async function criarUsuario(
  actorUserId: number,
  input: UsuarioInput,
  options?: { id?: number },
  meta?: { ip?: string; userAgent?: string },
): Promise<UsuarioPublico> {
  const dados = await validarEntrada(input, null);

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

  const usuario: Usuario = { id: nextId, ...dados };
  setUsuarios((current) => [...current, usuario]);
  registrarAuditoria(
    {
      entidade: "user",
      registroId: String(nextId),
      acao: "INSERT",
      dadosAnteriores: "",
      dadosNovos: usuario.nome,
      camposAlterados: "codigo, nome, cargo_id, email",
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

  const dados = await validarEntrada({ ...input, codigoRe: input.codigoRe ?? atual.codigoRe }, usuarioId);
  const atualizado: Usuario = { id: usuarioId, ...dados };
  setUsuarios((current) => current.map((item) => (item.id === usuarioId ? atualizado : item)));
  registrarAuditoria(
    {
      entidade: "user",
      registroId: String(usuarioId),
      acao: "UPDATE",
      dadosAnteriores: atual.nome,
      dadosNovos: atualizado.nome,
      camposAlterados: input.senha?.trim() ? "codigo, nome, cargo_id, email, senha" : "codigo, nome, cargo_id, email",
    },
    actorUserId,
    meta,
  );
  return usuarioParaResposta(atualizado);
}

export function excluirUsuario(
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
