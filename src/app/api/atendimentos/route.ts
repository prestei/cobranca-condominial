import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  AtendimentoServiceError,
  criarAtendimento,
  listarAtendimentos,
  requestMeta,
  type AtendimentoFiltros,
  type AtendimentoInput,
} from "@/lib/atendimentos/service";

function parseFiltros(searchParams: URLSearchParams): AtendimentoFiltros {
  const filtros: AtendimentoFiltros = {};
  const unidadeId = Number(searchParams.get("unidadeId"));
  if (Number.isFinite(unidadeId) && unidadeId > 0) filtros.unidadeId = unidadeId;
  const status = searchParams.get("status");
  if (status && status !== "todos") filtros.status = status;
  const canal = searchParams.get("canal");
  if (canal && canal !== "todos") filtros.canal = canal;
  const busca = searchParams.get("q") ?? searchParams.get("busca");
  if (busca?.trim()) filtros.busca = busca.trim();
  return filtros;
}

function parseAtendimentoBody(body: unknown): AtendimentoInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const condominioId = Number(record.condominioId);
  const unidadeId = Number(record.unidadeId);
  const responsavelRaw = record.responsavelId;
  const responsavelId =
    responsavelRaw === null || responsavelRaw === undefined || responsavelRaw === ""
      ? null
      : Number(responsavelRaw);
  const canal = typeof record.canal === "string" ? record.canal : "";
  const respondeu = typeof record.respondeu === "string" ? record.respondeu : "";
  const motivo = typeof record.motivo === "string" ? record.motivo : undefined;
  const assunto = typeof record.assunto === "string" ? record.assunto : undefined;
  const descricao = typeof record.descricao === "string" ? record.descricao : undefined;
  const status = typeof record.status === "string" ? record.status : "";
  const dataProximaAcao = typeof record.dataProximaAcao === "string" ? record.dataProximaAcao : undefined;
  const proximaAcao = typeof record.proximaAcao === "string" ? record.proximaAcao : undefined;
  if (!Number.isFinite(condominioId) || !Number.isFinite(unidadeId)) return null;
  return {
    condominioId,
    unidadeId,
    responsavelId: Number.isFinite(responsavelId) ? responsavelId : null,
    canal,
    respondeu,
    motivo,
    assunto,
    descricao,
    status,
    dataProximaAcao,
    proximaAcao,
  };
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "atendimentos", "ler");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  try {
    const atendimentos = listarAtendimentos(session.userId, parseFiltros(searchParams));
    return Response.json({ atendimentos });
  } catch (error) {
    if (error instanceof AtendimentoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar os atendimentos." }, { status: 500 });
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

  const input = parseAtendimentoBody(body);
  if (!input) {
    return Response.json({ error: "Dados do atendimento inválidos." }, { status: 400 });
  }

  try {
    const atendimento = criarAtendimento(session.userId, input, requestMeta(request));
    return Response.json({ atendimento }, { status: 201 });
  } catch (error) {
    if (error instanceof AtendimentoServiceError) {
      return Response.json({ error: error.message, detalhes: error.detalhes }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível registrar o atendimento." }, { status: 500 });
  }
}
