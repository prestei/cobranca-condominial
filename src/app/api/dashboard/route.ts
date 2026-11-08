import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  DashboardFiltrosError,
  parseFiltrosDashboard,
} from "@/lib/dashboard/filtros";
import { DashboardServiceError, obterDashboard } from "@/lib/dashboard/service";

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "dashboard", "ler");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);

  try {
    const filtros = parseFiltrosDashboard(searchParams);
    const dashboard = obterDashboard(session.userId, filtros);
    return Response.json({ dashboard });
  } catch (error) {
    if (error instanceof DashboardFiltrosError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof DashboardServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar o dashboard." }, { status: 500 });
  }
}
