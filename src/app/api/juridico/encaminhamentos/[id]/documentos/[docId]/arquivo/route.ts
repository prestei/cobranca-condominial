import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { JuridicoServiceError, obterArquivoDocumentoJuridico } from "@/lib/juridico/service";
import path from "node:path";

const MIME_POR_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".txt": "text/plain",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".zip": "application/zip",
};

type RouteContext = { params: Promise<{ id: string; docId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "juridico", "ler");
  if (denied) return denied;

  const { id, docId } = await context.params;
  if (!id?.trim() || !docId?.trim()) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const { buffer, nomeArquivo } = await obterArquivoDocumentoJuridico(session.userId, id, docId);
    const ext = path.extname(nomeArquivo).toLowerCase();
    const contentType = MIME_POR_EXT[ext] ?? "application/octet-stream";
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${nomeArquivo.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    if (error instanceof JuridicoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível baixar o arquivo." }, { status: 500 });
  }
}