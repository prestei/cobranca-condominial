import { getSession } from "@/lib/auth/session";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return Response.json({ user: null, permissoes: null });
  }
  return Response.json({
    user,
    permissoes: permissoesDoUsuarioId(user.userId),
  });
}
