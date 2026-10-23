import { buscarUsuarioPorCodigoLogin } from "@/data/catalogo";
import { verifyPassword } from "@/lib/auth/password";

export async function findUsuarioPorCredenciais(codigo: string, senha: string) {
  if (!codigo.trim() || !senha) return null;

  const usuario = buscarUsuarioPorCodigoLogin(codigo);
  if (!usuario) return null;

  const valido = await verifyPassword(senha, usuario.senha);
  if (!valido) return null;

  return usuario;
}
