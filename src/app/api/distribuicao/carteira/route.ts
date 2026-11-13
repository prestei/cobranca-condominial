import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { DistribuicaoServiceError, listarCarteiraPorRe } from "@/lib/distribuicao/service";

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const denied = await requirePermissao(session, "usuarios", "criar");
  if (denied) return denied;

  try {
    return Response.json({ carteiras: await listarCarteiraPorRe(session.userId) });
  } catch (error) {
    if (error instanceof DistribuicaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar as carteiras." }, { status: 500 });
  }
}
