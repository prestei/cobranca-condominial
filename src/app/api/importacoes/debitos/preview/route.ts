import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { requirePermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
import { ImportacaoDebitosError, previewImportacaoDebitos } from "@/lib/importacoes/debitos-service";

function parseBody(
  body: unknown,
): {
  origem: string;
  arquivo?: string;
  conteudo?: string;
  processoId?: string;
  hashArquivo?: string;
} | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const origem = typeof record.origem === "string" ? record.origem : "";
  const arquivo = typeof record.arquivo === "string" ? record.arquivo : undefined;
  const conteudo = typeof record.conteudo === "string" ? record.conteudo : undefined;
  const processoId = typeof record.processoId === "string" ? record.processoId : undefined;
  const hashArquivo = typeof record.hashArquivo === "string" ? record.hashArquivo : undefined;
  return { origem, arquivo, conteudo, processoId, hashArquivo };
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = requirePermissaoAcaoImportacao(session, "visualizarPrevia");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parseBody(body);
  if (!input) {
    return Response.json({ error: "Dados da importação inválidos." }, { status: 400 });
  }

  try {
    const preview = await previewImportacaoDebitos(session.userId, input);
    return Response.json({ preview });
  } catch (error) {
    if (error instanceof ImportacaoDebitosError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível validar o arquivo." }, { status: 500 });
  }
}
