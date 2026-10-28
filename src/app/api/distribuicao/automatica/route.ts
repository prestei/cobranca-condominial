import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  DistribuicaoServiceError,
  atualizarConfigDistribuicaoAutomatica,
  contarUnidadesAguardandoAtribuicao,
  obterConfigDistribuicaoAutomatica,
  type DistribuicaoAutomaticaEstrategia,
} from "@/lib/distribuicao/service";

const ESTRATEGIAS: DistribuicaoAutomaticaEstrategia[] = ["carga", "rodizio", "condominio", "volume"];

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "usuarios", "criar");
  if (denied) return denied;

  return Response.json({
    config: obterConfigDistribuicaoAutomatica(),
    aguardandoAtribuicao: contarUnidadesAguardandoAtribuicao(session.userId),
  });
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "usuarios", "criar");
  if (denied) return denied;

  let body: { ativada?: boolean; estrategia?: string };
  try {
    body = (await request.json()) as { ativada?: boolean; estrategia?: string };
  } catch {
    return Response.json({ error: "Corpo JSON inválido." }, { status: 400 });
  }

  const patch: { ativada?: boolean; estrategia?: DistribuicaoAutomaticaEstrategia } = {};
  if (typeof body.ativada === "boolean") patch.ativada = body.ativada;
  if (body.estrategia && ESTRATEGIAS.includes(body.estrategia as DistribuicaoAutomaticaEstrategia)) {
    patch.estrategia = body.estrategia as DistribuicaoAutomaticaEstrategia;
  }

  try {
    const config = atualizarConfigDistribuicaoAutomatica(session.userId, patch);
    return Response.json({
      config,
      aguardandoAtribuicao: contarUnidadesAguardandoAtribuicao(session.userId),
    });
  } catch (error) {
    if (error instanceof DistribuicaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível atualizar a distribuição automática." }, { status: 500 });
  }
}
