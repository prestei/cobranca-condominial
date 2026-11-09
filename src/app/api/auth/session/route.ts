import { getSession } from "@/lib/auth/session";
import { identityPgDisponivel, permissoesDoUsuarioIdPg } from "@/lib/db/identity-pg";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return Response.json({ user: null, permissoes: null });
  }
  const permissoes = identityPgDisponivel()
    ? ((await permissoesDoUsuarioIdPg(user.userId)) ?? permissoesDoUsuarioId(user.userId))
    : permissoesDoUsuarioId(user.userId);
  return Response.json({
    user,
    permissoes,
  });
}
