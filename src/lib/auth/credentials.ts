import { findUserByLoginCode } from "@/lib/db/repositories/identity-repository";
import { verifyPassword } from "@/lib/auth/password";

export async function findUsuarioPorCredenciais(codigo: string, senha: string) {
  if (!codigo.trim() || !senha) return null;

  const usuario = await findUserByLoginCode(codigo);
  if (!usuario) return null;

  const valido = await verifyPassword(senha, usuario.senha);
  if (!valido) return null;

  if (usuario.ativo === false) return null;

  return usuario;
}
