import { verifyPassword } from "@/lib/auth/password";
import { findUsuarioByCodigo } from "@/lib/users/repository";

export async function findUsuarioPorCredenciais(codigo: string, senha: string) {
  if (!codigo.trim() || !senha) return null;

  const usuario = await findUsuarioByCodigo(codigo);
  if (!usuario) return null;

  const valido = await verifyPassword(senha, usuario.senha);
  if (!valido) return null;

  return usuario;
}
