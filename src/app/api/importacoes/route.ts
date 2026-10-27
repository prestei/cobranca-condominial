import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { listarImportacoes } from "@/lib/importacoes/debitos-service";

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "importacoes", "ler");
  if (denied) return denied;

  const importacoes = listarImportacoes(session.userId);
  return Response.json({ importacoes });
}
