import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { requirePermissaoAcaoImportacao } from "@/lib/importacoes/permissoes";
import { ImportacaoDebitosError, corrigirLinhaPreviewImportacaoDebitos } from "@/lib/importacoes/debitos-service";

function parseBody(
  body: unknown,
): {
  sessaoPreviaId: string;
  hashArquivo: string;
  linha: number;
  campos: Record<string, string>;
} | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const sessaoPreviaId = typeof record.sessaoPreviaId === "string" ? record.sessaoPreviaId.trim() : "";
  const hashArquivo = typeof record.hashArquivo === "string" ? record.hashArquivo.trim() : "";
  const linha = typeof record.linha === "number" ? record.linha : Number(record.linha);
  const campos = record.campos;
  if (!sessaoPreviaId || !hashArquivo || !Number.isFinite(linha) || linha < 1) return null;
  if (!campos || typeof campos !== "object" || Array.isArray(campos)) return null;
  const camposNormalizados: Record<string, string> = {};
  for (const [chave, valor] of Object.entries(campos as Record<string, unknown>)) {
    if (typeof valor === "string") camposNormalizados[chave] = valor;
  }
  if (Object.keys(camposNormalizados).length === 0) return null;
  return { sessaoPreviaId, hashArquivo, linha, campos: camposNormalizados };
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = requirePermissaoAcaoImportacao(session, "corrigirRegistros");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parseBody(body);
  if (!input) {
    return Response.json({ error: "Informe sessão, hash, linha e campos a corrigir." }, { status: 400 });
  }

  try {
    const resultado = corrigirLinhaPreviewImportacaoDebitos(session.userId, input);
    return Response.json(resultado);
  } catch (error) {
    if (error instanceof ImportacaoDebitosError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível aplicar a correção." }, { status: 500 });
  }
}
