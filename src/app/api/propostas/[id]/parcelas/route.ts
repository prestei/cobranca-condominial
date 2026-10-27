import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  AcordoServiceError,
  PropostaNegociacaoServiceError,
  listarParcelasAcordo,
  obterResumoAcordo,
  registrarParcelasAcordo,
  requestMeta,
  type ParcelaAcordoInput,
} from "@/lib/acordos/service";

type RouteContext = { params: Promise<{ id: string }> };

function parseParcelasBody(body: unknown): ParcelaAcordoInput[] | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const parcelasRaw = record.parcelas;
  if (!Array.isArray(parcelasRaw)) return null;
  const parcelas: ParcelaAcordoInput[] = [];
  for (const item of parcelasRaw) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    parcelas.push({
      numero: Number(row.numero),
      valorPrevisto: typeof row.valorPrevisto === "string" ? row.valorPrevisto : "",
      vencimentoEm: typeof row.vencimentoEm === "string" ? row.vencimentoEm : "",
    });
  }
  return parcelas;
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "atendimentos", "ler");
  if (denied) return denied;

  const { id } = await context.params;
  if (!id?.trim()) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const parcelas = listarParcelasAcordo(session.userId, id);
    const resumo = obterResumoAcordo(session.userId, id);
    return Response.json({ parcelas, resumo });
  } catch (error) {
    if (error instanceof AcordoServiceError || error instanceof PropostaNegociacaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar as parcelas." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "atendimentos", "criar");
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

  const parcelas = parseParcelasBody(body);
  if (!parcelas) {
    return Response.json({ error: "Informe o array parcelas." }, { status: 400 });
  }

  try {
    const salvas = registrarParcelasAcordo(session.userId, id, parcelas, requestMeta(request));
    const resumo = obterResumoAcordo(session.userId, id);
    return Response.json({ parcelas: salvas, resumo }, { status: 201 });
  } catch (error) {
    if (error instanceof AcordoServiceError || error instanceof PropostaNegociacaoServiceError) {
      return Response.json({ error: error.message, detalhes: error.detalhes }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível registrar as parcelas." }, { status: 500 });
  }
}
