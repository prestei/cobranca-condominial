import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { obterPerfilMinhaConta } from "@/lib/usuarios/service";

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const perfil = obterPerfilMinhaConta(session.userId);
  if (!perfil) {
    return Response.json({ error: "Colaborador não encontrado." }, { status: 404 });
  }

  return Response.json({ perfil });
}
