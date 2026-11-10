import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { loadFullOperationalCadastros } from "@/lib/db/cadastros-scope";

/** Catálogo operacional completo para a UI (fonte: PostgreSQL via Prisma). */
export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  const cadastros = await loadFullOperationalCadastros();
  return Response.json(cadastros);
}
