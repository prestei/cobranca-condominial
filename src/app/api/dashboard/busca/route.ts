import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { BuscaGlobalError, buscarGlobalDashboard } from "@/lib/dashboard/busca-global";

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "dashboard", "ler");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? searchParams.get("busca") ?? "";

  try {
    const resultado = buscarGlobalDashboard(session.userId, q);
    return Response.json({ busca: resultado });
  } catch (error) {
    if (error instanceof BuscaGlobalError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível realizar a busca." }, { status: 500 });
  }
}
