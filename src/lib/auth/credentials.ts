import { buscarUsuarioPorCodigoLogin } from "@/data/catalogo";
import { verifyPassword } from "@/lib/auth/password";
import { buscarUsuarioPorCodigoLoginPg, identityPgDisponivel } from "@/lib/db/identity-pg";

export async function findUsuarioPorCredenciais(codigo: string, senha: string) {
  if (!codigo.trim() || !senha) return null;

  const usuario = identityPgDisponivel()
    ? await buscarUsuarioPorCodigoLoginPg(codigo)
    : buscarUsuarioPorCodigoLogin(codigo);
  if (!usuario) return null;

  const valido = await verifyPassword(senha, usuario.senha);
  if (!valido) return null;

  if (usuario.ativo === false) return null;

  return usuario;
}
