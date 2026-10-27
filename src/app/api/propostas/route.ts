import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  PropostaNegociacaoServiceError,
  criarPropostaNegociacao,
  listarPropostasNegociacao,
  requestMeta,
  type PropostaNegociacaoFiltros,
  type PropostaNegociacaoInput,
} from "@/lib/negociacoes/service";

function parseFiltros(searchParams: URLSearchParams): PropostaNegociacaoFiltros {
  const filtros: PropostaNegociacaoFiltros = {};
  const unidadeId = Number(searchParams.get("unidadeId"));
  if (Number.isFinite(unidadeId) && unidadeId > 0) filtros.unidadeId = unidadeId;
  const status = searchParams.get("status");
  if (status && status !== "todos") filtros.status = status;
  return filtros;
}

function parsePropostaBody(body: unknown): PropostaNegociacaoInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const condominioId = Number(record.condominioId);
  const unidadeId = Number(record.unidadeId);
  const valorProposto = typeof record.valorProposto === "string" ? record.valorProposto : "";
  const observacoes = typeof record.observacoes === "string" ? record.observacoes : undefined;
  const debitoIdsRaw = record.debitoIds;
  const debitoIds = Array.isArray(debitoIdsRaw)
    ? debitoIdsRaw.map((item) => Number(item)).filter((id) => Number.isFinite(id) && id > 0)
    : [];
  if (!Number.isFinite(condominioId) || !Number.isFinite(unidadeId)) return null;
  return { condominioId, unidadeId, valorProposto, observacoes, debitoIds };
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "atendimentos", "ler");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  try {
    const propostas = listarPropostasNegociacao(session.userId, parseFiltros(searchParams));
    return Response.json({ propostas });
  } catch (error) {
    if (error instanceof PropostaNegociacaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar as propostas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "atendimentos", "criar");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parsePropostaBody(body);
  if (!input) {
    return Response.json({ error: "Dados da proposta inválidos." }, { status: 400 });
  }

  try {
    const proposta = criarPropostaNegociacao(session.userId, input, requestMeta(request));
    return Response.json({ proposta }, { status: 201 });
  } catch (error) {
    if (error instanceof PropostaNegociacaoServiceError) {
      return Response.json({ error: error.message, detalhes: error.detalhes }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível registrar a proposta." }, { status: 500 });
  }
}
