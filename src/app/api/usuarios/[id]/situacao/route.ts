import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  alterarSituacaoUsuario,
  requestMeta,
  UsuarioServiceError,
} from "@/lib/usuarios/service";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "usuarios", "editar");
  if (denied) return denied;

  const { id: idParam } = await context.params;
  const usuarioId = Number(idParam);
  if (!Number.isFinite(usuarioId)) {
    return Response.json({ error: "Colaborador inválido." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || !("ativo" in body)) {
    return Response.json({ error: "Informe se o colaborador ficará ativo ou inativo." }, { status: 400 });
  }

  const ativo = Boolean((body as Record<string, unknown>).ativo);

  try {
    const usuario = await alterarSituacaoUsuario(session.userId, usuarioId, ativo, requestMeta(request));
    return Response.json({ usuario });
  } catch (error) {
    if (error instanceof UsuarioServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível alterar a situação do colaborador." }, { status: 500 });
  }
}
