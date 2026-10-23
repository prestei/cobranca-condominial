import { cargoExiste } from "@/lib/roles/repository";
import { codigoUsuarioValido, normalizarCodigoUsuario } from "@/lib/auth/login-code";
import { digitosCpf } from "@/lib/cpf";
import { digitosDataNascimento } from "@/lib/birth-date";
import * as repo from "@/lib/users/repository";
import type { UsuarioFieldErrors, UsuarioInput } from "@/lib/users/types";

export async function validarUsuarioInput(
  input: UsuarioInput,
  options: { editingId: number | null; exigeSenha: boolean },
): Promise<UsuarioFieldErrors> {
  const nome = input.nome.trim();
  const codigo = normalizarCodigoUsuario(input.codigo);
  const email = input.email.trim();
  const senha = input.senha?.trim() ?? "";
  const errors: UsuarioFieldErrors = {};

  if (!nome) errors.nome = "Informe o nome.";
  if (!codigo) errors.codigo = "Informe o código de login.";
  else if (!codigoUsuarioValido(codigo)) {
    errors.codigo = "Use de 2 a 32 caracteres (letras, números, ponto, hífen ou sublinhado).";
  } else if (await repo.codigoJaExiste(codigo, options.editingId)) {
    errors.codigo = "Já existe um colaborador com este código.";
  }

  if (!input.cargoId || !(await cargoExiste(input.cargoId))) {
    errors.cargoId = "Selecione o cargo.";
  }

  const cpf = digitosCpf(input.cpf);
  if (cpf.length > 0 && cpf.length !== 11) {
    errors.cpf = "Informe o CPF completo.";
  }

  const dataNascimento = digitosDataNascimento(input.dataNascimento);
  if (dataNascimento.length > 0 && dataNascimento.length !== 8) {
    errors.dataNascimento = "Informe a data completa (DD/MM/AAAA).";
  }

  if (!email) errors.email = "Informe o e-mail de acesso.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Informe um e-mail válido.";
  else if (await repo.emailJaExiste(email, options.editingId)) {
    errors.email = "Já existe um colaborador com este e-mail.";
  }

  if (options.exigeSenha && !senha) errors.senha = "Informe a senha de acesso.";

  return errors;
}
