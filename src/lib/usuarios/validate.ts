import { getCadastros } from "@/data/catalogo";
import { codigoUsuarioValido, normalizarCodigoUsuario } from "@/lib/auth/codigo";
import type { UsuarioFieldErrors, UsuarioInput } from "@/lib/usuarios/types";

export function validarUsuarioInput(
  input: UsuarioInput,
  options: { editingId: number | null; exigeSenha: boolean },
): UsuarioFieldErrors {
  const usuarios = getCadastros().usuarios;
  const nome = input.nome.trim();
  const codigo = normalizarCodigoUsuario(input.codigo);
  const email = input.email.trim();
  const senha = input.senha?.trim() ?? "";
  const errors: UsuarioFieldErrors = {};

  if (!nome) errors.nome = "Informe o nome.";
  if (!codigo) errors.codigo = "Informe o código de login.";
  else if (!codigoUsuarioValido(codigo)) {
    errors.codigo = "Use de 2 a 32 caracteres (letras, números, ponto, hífen ou sublinhado).";
  } else if (
    usuarios.some(
      (item) => item.id !== options.editingId && normalizarCodigoUsuario(item.codigo) === codigo,
    )
  ) {
    errors.codigo = "Já existe um colaborador com este código.";
  }

  if (!input.cargoId || !getCadastros().cargos.some((item) => item.id === input.cargoId)) {
    errors.cargoId = "Selecione o cargo.";
  }

  if (!email) errors.email = "Informe o e-mail de acesso.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Informe um e-mail válido.";
  else if (
    usuarios.some(
      (item) =>
        item.id !== options.editingId && item.email.localeCompare(email, "pt-BR", { sensitivity: "base" }) === 0,
    )
  ) {
    errors.email = "Já existe um colaborador com este e-mail.";
  }

  if (options.exigeSenha && !senha) errors.senha = "Informe a senha de acesso.";

  return errors;
}
