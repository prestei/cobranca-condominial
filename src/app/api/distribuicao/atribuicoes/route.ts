import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import {
  DistribuicaoServiceError,
  distribuirUnidades,
  podeGerenciarDistribuicao,
} from "@/lib/distribuicao/service";
import { getCadastros } from "@/data/catalogo";
import { requestMeta } from "@/lib/unidades/service";

function parseBody(body: unknown): { unidadeIds: number[]; codigoRe: string; motivo?: string } | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const codigoRe = typeof record.codigoRe === "string" ? record.codigoRe : "";
  const motivo = typeof record.motivo === "string" ? record.motivo : undefined;
  const rawIds = record.unidadeIds;
  if (!Array.isArray(rawIds)) return null;
  const unidadeIds = rawIds.map((item) => Number(item)).filter((id) => Number.isFinite(id) && id > 0);
  if (!codigoRe.trim() || unidadeIds.length === 0) return null;
  return { unidadeIds, codigoRe, motivo };
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  if (!podeGerenciarDistribuicao(session.userId)) {
    return Response.json({ error: "Sem permissão para distribuir cobranças." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parseBody(body);
  if (!input) {
    return Response.json({ error: "Informe unidades e RE do atendente." }, { status: 400 });
  }

  try {
    const resultado = distribuirUnidades(session.userId, input, requestMeta(request));
    return Response.json({
      ...resultado,
      atribuicoesCobranca: getCadastros().atribuicoesCobranca,
    });
  } catch (error) {
    if (error instanceof DistribuicaoServiceError) {
      return Response.json(
        { error: error.message, detalhes: error.detalhes ?? [] },
        { status: error.status },
      );
    }
    return Response.json({ error: "Não foi possível concluir a distribuição." }, { status: 500 });
  }
}
