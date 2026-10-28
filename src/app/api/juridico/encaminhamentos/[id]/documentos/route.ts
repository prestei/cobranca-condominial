import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  JuridicoServiceError,
  obterEncaminhamentoJuridico,
  registrarDocumentoJuridico,
  requestMeta,
  type DocumentoJuridicoInput,
} from "@/lib/juridico/service";

function parseDocumentoBody(body: unknown): DocumentoJuridicoInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const titulo = typeof record.titulo === "string" ? record.titulo : "";
  if (!titulo.trim()) return null;
  const descricao = typeof record.descricao === "string" ? record.descricao : undefined;
  const referenciaArquivo = typeof record.referenciaArquivo === "string" ? record.referenciaArquivo : undefined;
  return { titulo, descricao, referenciaArquivo };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "juridico", "ler");
  if (denied) return denied;

  const { id } = await context.params;
  if (!id?.trim()) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const encaminhamento = obterEncaminhamentoJuridico(session.userId, id);
    return Response.json({ documentos: encaminhamento.documentos ?? [] });
  } catch (error) {
    if (error instanceof JuridicoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar os documentos." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "juridico", "editar");
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

  const input = parseDocumentoBody(body);
  if (!input) {
    return Response.json({ error: "Dados do documento inválidos." }, { status: 400 });
  }

  try {
    const documento = registrarDocumentoJuridico(session.userId, id, input, requestMeta(request));
    return Response.json({ documento }, { status: 201 });
  } catch (error) {
    if (error instanceof JuridicoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível registrar o documento." }, { status: 500 });
  }
}
