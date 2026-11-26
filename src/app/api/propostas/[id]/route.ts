import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { requirePropostaEditar, requirePropostaLer } from "@/lib/api/require-proposta-auth";
import {
  PropostaNegociacaoServiceError,
  atualizarConteudoPropostaNegociacao,
  atualizarStatusPropostaNegociacao,
  obterPropostaNegociacaoDetalhe,
  requestMeta,
  type PropostaNegociacaoConteudoInput,
  type PropostaNegociacaoStatusInput,
} from "@/lib/negociacoes/service";

function parseStatusBody(body: unknown): PropostaNegociacaoStatusInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const status = typeof record.status === "string" ? record.status : "";
  const termosAprovados = typeof record.termosAprovados === "string" ? record.termosAprovados : undefined;
  const primeiroVencimento =
    typeof record.primeiroVencimento === "string" ? record.primeiroVencimento : undefined;
  if (!status.trim()) return null;
  return { status, termosAprovados, primeiroVencimento };
}

function parseConteudoBody(body: unknown): PropostaNegociacaoConteudoInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  if (typeof record.status === "string" && record.status.trim()) return null;
  const valorProposto = typeof record.valorProposto === "string" ? record.valorProposto : "";
  const observacoes = typeof record.observacoes === "string" ? record.observacoes : undefined;
  const debitoIdsRaw = record.debitoIds;
  const debitoIds = Array.isArray(debitoIdsRaw)
    ? debitoIdsRaw.map((item) => Number(item)).filter((id) => Number.isFinite(id) && id > 0)
    : [];
  const quantidadeParcelasRaw = record.quantidadeParcelas;
  const quantidadeParcelas =
    quantidadeParcelasRaw == null || quantidadeParcelasRaw === ""
      ? null
      : Number(quantidadeParcelasRaw);
  if (!valorProposto.trim() || debitoIds.length === 0) return null;
  return { valorProposto, observacoes, debitoIds, quantidadeParcelas };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePropostaLer(session);
  if (denied) return denied;

  const { id } = await context.params;
  if (!id?.trim()) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const detalhe = await obterPropostaNegociacaoDetalhe(session.userId, id);
    return Response.json({ proposta: detalhe.proposta, detalhe });
  } catch (error) {
    if (error instanceof PropostaNegociacaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar a proposta." }, { status: 500 });
  }
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

  const statusInput = parseStatusBody(body);
  const conteudoInput = statusInput ? null : parseConteudoBody(body);
  if (!statusInput && !conteudoInput) {
    return Response.json({ error: "Dados da alteração inválidos." }, { status: 400 });
  }

  try {
    const proposta = statusInput
      ? await atualizarStatusPropostaNegociacao(session.userId, id, statusInput, requestMeta(request))
      : await atualizarConteudoPropostaNegociacao(session.userId, id, conteudoInput!, requestMeta(request));
    return Response.json({ proposta });
  } catch (error) {
    if (error instanceof PropostaNegociacaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível atualizar a proposta." }, { status: 500 });
  }
}
