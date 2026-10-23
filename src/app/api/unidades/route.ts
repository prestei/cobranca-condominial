import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  criarUnidade,
  listarUnidades,
  requestMeta,
  UnidadeServiceError,
  type UnidadeInput,
} from "@/lib/unidades/service";

function parseUnidadeBody(body: unknown): UnidadeInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const condominioId = Number(record.condominioId);
  const identificacao = typeof record.identificacao === "string" ? record.identificacao : "";
  const bloco = typeof record.bloco === "string" ? record.bloco : "";
  const tipo = typeof record.tipo === "string" ? record.tipo : "";
  const status = typeof record.status === "string" ? record.status : "";
  const situacao = typeof record.situacao === "string" ? record.situacao : undefined;
  if (!Number.isFinite(condominioId)) return null;
  return { condominioId, identificacao, bloco, tipo, status, situacao };
}

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "unidades", "ler");
  if (denied) return denied;
  const unidades = listarUnidades(session.userId);
  return Response.json({ unidades });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "unidades", "criar");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parseUnidadeBody(body);
  if (!input) {
    return Response.json({ error: "Dados da unidade inválidos." }, { status: 400 });
  }

  try {
    const unidade = criarUnidade(session.userId, input, requestMeta(request));
    return Response.json({ unidade }, { status: 201 });
  } catch (error) {
    if (error instanceof UnidadeServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível cadastrar a unidade." }, { status: 500 });
  }
}
