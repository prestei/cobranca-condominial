import {
  getCadastros,
  registrarAuditoria,
  setUsuarios,
  type Usuario,
} from "@/data/catalogo";
import { normalizarCodigoUsuario } from "@/lib/auth/codigo";
import { hashPassword } from "@/lib/auth/password";
import { usuarioPublico, usuariosPublicos } from "@/lib/usuarios/serializar";
import type { UsuarioInput, UsuarioPublico } from "@/lib/usuarios/types";
import { validarUsuarioInput } from "@/lib/usuarios/validate";

function usuarioEmUso(id: number) {
  const atuais = getCadastros();
  return (
    atuais.atendimentos.some((item) => item.usuarioId === id) ||
    atuais.importacoes.some((item) => item.usuarioId === id) ||
    atuais.auditoria.some((item) => item.usuarioId === String(id))
  );
}

export function listarUsuariosPublicos(): UsuarioPublico[] {
  return usuariosPublicos(getCadastros().usuarios);
}

export async function criarUsuario(input: UsuarioInput, actorUserId: number) {
  const errors = validarUsuarioInput(input, { editingId: null, exigeSenha: true });
  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors };
  }

  const senhaHash = await hashPassword(input.senha!.trim());
  const usuarios = getCadastros().usuarios;
  const nextId = usuarios.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  const salvo: Usuario = {
    id: nextId,
    codigo: normalizarCodigoUsuario(input.codigo),
    cargoId: input.cargoId,
    nome: input.nome.trim(),
    telefone: input.telefone.trim(),
    email: input.email.trim(),
    senha: senhaHash,
  };

  setUsuarios((current) => [...current, salvo]);
  registrarAuditoria({
    entidade: "user",
    registroId: String(nextId),
    acao: "INSERT",
    dadosAnteriores: "",
    dadosNovos: salvo.nome,
    camposAlterados: "codigo, nome, cargo_id, email",
    usuarioId: String(actorUserId),
  });

  return { ok: true as const, usuario: usuarioPublico(salvo) };
}

export async function atualizarUsuario(id: number, input: UsuarioInput, actorUserId: number) {
  const anterior = getCadastros().usuarios.find((item) => item.id === id);
  if (!anterior) {
    return { ok: false as const, notFound: true };
  }

  const senhaNova = input.senha?.trim() ?? "";
  const errors = validarUsuarioInput(input, { editingId: id, exigeSenha: false });
  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors };
  }

  let senha = anterior.senha;
  if (senhaNova) {
    senha = await hashPassword(senhaNova);
  }

  const salvo: Usuario = {
    id,
    codigo: normalizarCodigoUsuario(input.codigo),
    cargoId: input.cargoId,
    nome: input.nome.trim(),
    telefone: input.telefone.trim(),
    email: input.email.trim(),
    senha,
  };

  setUsuarios((current) => current.map((item) => (item.id === id ? salvo : item)));
  registrarAuditoria({
    entidade: "user",
    registroId: String(id),
    acao: "UPDATE",
    dadosAnteriores: anterior.nome,
    dadosNovos: salvo.nome,
    camposAlterados: senhaNova ? "codigo, nome, cargo_id, email, senha" : "codigo, nome, cargo_id, email",
    usuarioId: String(actorUserId),
  });

  return { ok: true as const, usuario: usuarioPublico(salvo) };
}

export function excluirUsuario(id: number, actorUserId: number) {
  const alvo = getCadastros().usuarios.find((item) => item.id === id);
  if (!alvo) {
    return { ok: false as const, notFound: true };
  }
  if (id === actorUserId) {
    return { ok: false as const, error: "Você não pode excluir o próprio usuário enquanto estiver logado." };
  }
  if (usuarioEmUso(id)) {
    return {
      ok: false as const,
      error: "Existem atendimentos, importações ou auditoria ligados a esta pessoa.",
    };
  }

  setUsuarios((current) => current.filter((item) => item.id !== id));
  registrarAuditoria({
    entidade: "user",
    registroId: String(id),
    acao: "DELETE",
    dadosAnteriores: alvo.nome,
    dadosNovos: "",
    camposAlterados: "nome",
    usuarioId: String(actorUserId),
  });

  return { ok: true as const };
}
