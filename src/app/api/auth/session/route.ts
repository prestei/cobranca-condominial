import { createSession, getSession } from "@/lib/auth/session";
import { resolverPermissoesUsuario } from "@/lib/permissions/resolver";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return Response.json({ user: null, permissoes: null });
  }
  const permissoes = await resolverPermissoesUsuario(user.userId);
  // Atualiza o JWT com permissões frescas do PostgreSQL (proxy usa o cookie).
  await createSession({
    userId: user.userId,
    email: user.email,
    nome: user.nome,
    cargoId: user.cargoId,
    permissoes,
  });
  return Response.json({
    user: {
      userId: user.userId,
      email: user.email,
      nome: user.nome,
      cargoId: user.cargoId,
    },
    permissoes,
  });
}
