import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  AlertasPrazoInadimplenciaServiceError,
  atualizarConfigAlertasPrazoInadimplencia,
  obterConfigAlertasPrazoInadimplencia,
} from "@/lib/notificacoes/alertas-prazo-inadimplencia-service";

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "usuarios", "criar");
  if (denied) return denied;

  return Response.json({ config: obterConfigAlertasPrazoInadimplencia() });
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "usuarios", "criar");
  if (denied) return denied;

  let body: { antecedenciasDias?: unknown };
  try {
    body = (await request.json()) as { antecedenciasDias?: unknown };
  } catch {
    return Response.json({ error: "Corpo JSON inválido." }, { status: 400 });
  }

  try {
    const config = await atualizarConfigAlertasPrazoInadimplencia(session.userId, {
      antecedenciasDias: body.antecedenciasDias,
    });
    return Response.json({ config });
  } catch (error) {
    if (error instanceof AlertasPrazoInadimplenciaServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível atualizar os alertas de prazo." }, { status: 500 });
  }
}
