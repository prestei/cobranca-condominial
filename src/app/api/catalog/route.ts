import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { loadFullOperationalCadastros } from "@/lib/db/cadastros-scope";
import { limparCadastrosProvisionadosPreviaAbandonada } from "@/lib/importacoes/inadimplencia/reverter-provisionamento-previa-debitos";

/** Catálogo operacional completo para a UI (fonte: PostgreSQL via Prisma). */
export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  await limparCadastrosProvisionadosPreviaAbandonada(session.userId);
  const cadastros = await loadFullOperationalCadastros();
  return Response.json(cadastros);
}
