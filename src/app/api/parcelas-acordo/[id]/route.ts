import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { requirePropostaEditar } from "@/lib/api/require-proposta-auth";
import {
  AcordoServiceError,
  PropostaNegociacaoServiceError,
  cancelarParcelaAcordo,
  corrigirParcelaAcordo,
  obterResumoAcordo,
  requestMeta,
  type ParcelaAcordoCorrecaoInput,
} from "@/lib/acordos/service";
import { loadFullOperationalCadastros } from "@/lib/db/cadastros-scope";

type RouteContext = { params: Promise<{ id: string }> };

function parseCorrecaoBody(body: unknown): { correcao?: ParcelaAcordoCorrecaoInput; cancelar?: boolean } | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (record.cancelar === true) {
    return { cancelar: true };
  }
  const input: ParcelaAcordoCorrecaoInput = {};
  if (typeof record.valorPrevisto === "string") input.valorPrevisto = record.valorPrevisto;
  if (typeof record.vencimentoEm === "string") input.vencimentoEm = record.vencimentoEm;
  if (input.valorPrevisto === undefined && input.vencimentoEm === undefined) return null;
  return { correcao: input };
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePropostaEditar(session);
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

  const parsed = parseCorrecaoBody(body);
  if (!parsed) {
    return Response.json({ error: "Informe valor, vencimento ou cancelamento." }, { status: 400 });
  }

  try {
    const parcela = parsed.cancelar
      ? await cancelarParcelaAcordo(session.userId, id, requestMeta(request))
      : await corrigirParcelaAcordo(session.userId, id, parsed.correcao ?? {}, requestMeta(request));
    const propostaId = (await loadFullOperationalCadastros()).parcelasAcordo.find((item) => item.id === id)?.propostaId ?? parcela.propostaId;
    const resumo = await obterResumoAcordo(session.userId, propostaId);
    return Response.json({ parcela, resumo });
  } catch (error) {
    if (error instanceof AcordoServiceError || error instanceof PropostaNegociacaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível corrigir a parcela." }, { status: 500 });
  }
}
