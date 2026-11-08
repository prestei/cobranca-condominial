import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { DashboardServiceError, obterDashboard } from "@/lib/dashboard/service";

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "dashboard", "ler");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const dataBase = searchParams.get("dataBase")?.trim();
  const limiteRaw = Number(searchParams.get("limiteDias"));
  const limiteDias = Number.isFinite(limiteRaw) && limiteRaw >= 1 ? limiteRaw : undefined;

  try {
    const dashboard = obterDashboard(session.userId, { dataBase, limiteDias });
    return Response.json({ dashboard });
  } catch (error) {
    if (error instanceof DashboardServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar o dashboard." }, { status: 500 });
  }
}
