import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  JuridicoServiceError,
  obterEncaminhamentoJuridico,
  registrarDocumentoJuridico,
  registrarDocumentoJuridicoComArquivo,
  requestMeta,
  type DocumentoJuridicoInput,
} from "@/lib/juridico/service";
import { LEGAL_DOCUMENT_MAX_BYTES } from "@/lib/juridico/document-file-limits";

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
    const encaminhamento = await obterEncaminhamentoJuridico(session.userId, id);
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

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      let formData: FormData;
      try {
        formData = await request.formData();
      } catch {
        return Response.json({ error: "Envio inválido. Use multipart com o campo `arquivo`." }, { status: 400 });
      }
      const campoArquivo = formData.get("arquivo");
      if (!(campoArquivo instanceof File)) {
        return Response.json({ error: "Selecione um arquivo para enviar." }, { status: 400 });
      }
      if (campoArquivo.size > LEGAL_DOCUMENT_MAX_BYTES) {
        return Response.json(
          { error: `O arquivo excede ${Math.round(LEGAL_DOCUMENT_MAX_BYTES / (1024 * 1024))} MiB.` },
          { status: 400 },
        );
      }
      const buffer = Buffer.from(await campoArquivo.arrayBuffer());
      const documento = await registrarDocumentoJuridicoComArquivo(
        session.userId,
        id,
        { nome: campoArquivo.name, buffer },
        requestMeta(request),
      );
      return Response.json({ documento }, { status: 201 });
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

    const documento = await registrarDocumentoJuridico(session.userId, id, input, requestMeta(request));
    return Response.json({ documento }, { status: 201 });
  } catch (error) {
    if (error instanceof JuridicoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível registrar o documento." }, { status: 500 });
  }
}