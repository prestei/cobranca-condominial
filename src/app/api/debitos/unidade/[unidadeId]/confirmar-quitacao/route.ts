import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { DebitoServiceError, confirmarQuitacaoUnidade, requestMeta } from "@/lib/debitos/service";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

type RouteContext = { params: Promise<{ unidadeId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const perm = permissoesDoUsuarioId(session.userId);
  const deniedDebitos = !temPermissao(perm, "debitos", "editar");
  const deniedUnidades = !temPermissao(perm, "unidades", "editar");
  if (deniedDebitos && deniedUnidades) {
    const denied = await requirePermissao(session, "debitos", "editar");
    if (denied) return denied;
  }

  const { unidadeId: unidadeRaw } = await context.params;
  const unidadeId = Number(unidadeRaw);
  if (!Number.isFinite(unidadeId) || unidadeId <= 0) {
    return Response.json({ error: "Unidade inválida." }, { status: 400 });
  }

  let forcar = false;
  try {
    const body = (await request.json()) as { forcar?: boolean };
    forcar = Boolean(body?.forcar);
  } catch {
    /* corpo vazio */
  }

  try {
    const resultado = confirmarQuitacaoUnidade(session.userId, unidadeId, { forcar }, requestMeta(request));
    return Response.json(resultado);
  } catch (error) {
    if (error instanceof DebitoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível confirmar a quitação." }, { status: 500 });
  }
}
