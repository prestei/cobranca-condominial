import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import {
  DistribuicaoServiceError,
  listarCarteiraPorRe,
  podeGerenciarDistribuicaoAsync,
} from "@/lib/distribuicao/service";

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  if (!(await podeGerenciarDistribuicaoAsync(session.userId))) {
    return Response.json({ error: "Sem permissão para consultar carteiras." }, { status: 403 });
  }

  try {
    return Response.json({ carteiras: await listarCarteiraPorRe(session.userId) });
  } catch (error) {
    if (error instanceof DistribuicaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar as carteiras." }, { status: 500 });
  }
}
