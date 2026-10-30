import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { IndicadoresServiceError, obterPainelIndicadores } from "@/lib/indicadores/service";

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "relatorios", "ler");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const dataBase = searchParams.get("dataBase")?.trim();
  const limiteRaw = Number(searchParams.get("limiteDias"));
  const limiteDias = Number.isFinite(limiteRaw) && limiteRaw >= 1 ? limiteRaw : undefined;

  try {
    const painel = obterPainelIndicadores(session.userId, { dataBase, limiteDias });
    return Response.json({ painel });
  } catch (error) {
    if (error instanceof IndicadoresServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar os indicadores." }, { status: 500 });
  }
}
