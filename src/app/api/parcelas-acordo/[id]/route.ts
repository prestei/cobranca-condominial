import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  AcordoServiceError,
  PropostaNegociacaoServiceError,
  corrigirParcelaAcordo,
  obterResumoAcordo,
  requestMeta,
  type ParcelaAcordoCorrecaoInput,
} from "@/lib/acordos/service";
import { getCadastros } from "@/data/catalogo";

type RouteContext = { params: Promise<{ id: string }> };

function parseCorrecaoBody(body: unknown): ParcelaAcordoCorrecaoInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const input: ParcelaAcordoCorrecaoInput = {};
  if (typeof record.valorPrevisto === "string") input.valorPrevisto = record.valorPrevisto;
  if (typeof record.vencimentoEm === "string") input.vencimentoEm = record.vencimentoEm;
  if (input.valorPrevisto === undefined && input.vencimentoEm === undefined) return null;
  return input;
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "atendimentos", "editar");
  if (denied) return denied;

  const { id } = await context.params;
  if (!id?.trim()) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parseCorrecaoBody(body);
  if (!input) {
    return Response.json({ error: "Informe valor ou vencimento para correção." }, { status: 400 });
  }

  try {
    const parcela = corrigirParcelaAcordo(session.userId, id, input, requestMeta(request));
    const propostaId = getCadastros().parcelasAcordo.find((item) => item.id === id)?.propostaId ?? parcela.propostaId;
    const resumo = obterResumoAcordo(session.userId, propostaId);
    return Response.json({ parcela, resumo });
  } catch (error) {
    if (error instanceof AcordoServiceError || error instanceof PropostaNegociacaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível corrigir a parcela." }, { status: 500 });
  }
}
