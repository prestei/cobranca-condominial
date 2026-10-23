import { getCadastros, registrarAuditoria, setUsuarios, type Usuario } from "@/lib/catalog";
import { normalizarCodigoUsuario } from "@/lib/auth/login-code";
import { hashPassword } from "@/lib/auth/password";
import * as repo from "@/lib/users/repository";
import { usuarioPublico, usuariosPublicos } from "@/lib/users/serialize";
import type { UsuarioInput, UsuarioPublico } from "@/lib/users/types";
import { digitosCpf } from "@/lib/cpf";
import { digitosDataNascimento } from "@/lib/birth-date";
import { digitosTelefone } from "@/lib/telefone";
import { validarUsuarioInput } from "@/lib/users/validate";

function usuarioEmUso(id: number) {
  const atuais = getCadastros();
  return (
    atuais.atendimentos.some((item) => item.usuarioId === id) ||
    atuais.importacoes.some((item) => item.usuarioId === id) ||
    atuais.auditoria.some((item) => item.usuarioId === String(id))
  );
}

async function sincronizarCatalogoUsuarios(usuarios: Usuario[]) {
  setUsuarios(usuarios);
}

export async function listarUsuariosPublicos(): Promise<UsuarioPublico[]> {
  const usuarios = await repo.listUsuarios();
  await sincronizarCatalogoUsuarios(usuarios);
  return usuariosPublicos(usuarios);
}

export async function criarUsuario(input: UsuarioInput, actorUserId: number) {
  const errors = await validarUsuarioInput(input, { editingId: null, exigeSenha: true });
  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors };
  }

  const senhaHash = await hashPassword(input.senha!.trim());
  const salvo = await repo.insertUsuario({
    codigo: normalizarCodigoUsuario(input.codigo),
    cargoId: input.cargoId,
    nome: input.nome.trim(),
    cpf: digitosCpf(input.cpf),
    dataNascimento: digitosDataNascimento(input.dataNascimento),
    telefone: digitosTelefone(input.telefone),
    email: input.email.trim(),
    senha: senhaHash,
  });

  await sincronizarCatalogoUsuarios(await repo.listUsuarios());
  registrarAuditoria({
    entidade: "user",
    registroId: String(salvo.id),
    acao: "INSERT",
    dadosAnteriores: "",
    dadosNovos: salvo.nome,
    camposAlterados: "codigo, nome, cargo_id, email",
    usuarioId: String(actorUserId),
  });

  return { ok: true as const, usuario: usuarioPublico(salvo) };
}

export async function atualizarUsuario(id: number, input: UsuarioInput, actorUserId: number) {
  const anterior = await repo.findUsuarioById(id);
  if (!anterior) {
    return { ok: false as const, notFound: true };
  }

  const senhaNova = input.senha?.trim() ?? "";
  const errors = await validarUsuarioInput(input, { editingId: id, exigeSenha: false });
  if (Object.keys(errors).length > 0) {
    return { ok: false as const, errors };
  }

  let senha = anterior.senha;
  if (senhaNova) {
    senha = await hashPassword(senhaNova);
  }

  const salvo = await repo.updateUsuario(id, {
    codigo: normalizarCodigoUsuario(input.codigo),
    cargoId: input.cargoId,
    nome: input.nome.trim(),
    cpf: digitosCpf(input.cpf),
    dataNascimento: digitosDataNascimento(input.dataNascimento),
    telefone: digitosTelefone(input.telefone),
    email: input.email.trim(),
    senha,
  });

  if (!salvo) {
    return { ok: false as const, notFound: true };
  }

  await sincronizarCatalogoUsuarios(await repo.listUsuarios());
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

export async function excluirUsuario(id: number, actorUserId: number) {
  const alvo = await repo.findUsuarioById(id);
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

  const removed = await repo.deleteUsuarioById(id);
  if (!removed) {
    return { ok: false as const, notFound: true };
  }

  await sincronizarCatalogoUsuarios(await repo.listUsuarios());
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
