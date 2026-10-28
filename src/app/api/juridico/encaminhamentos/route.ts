import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  JuridicoServiceError,
  criarEncaminhamentoJuridico,
  listarEncaminhamentosJuridicos,
  requestMeta,
  type EncaminhamentoJuridicoFiltros,
  type EncaminhamentoJuridicoInput,
} from "@/lib/juridico/service";

function parseFiltros(searchParams: URLSearchParams): EncaminhamentoJuridicoFiltros {
  const filtros: EncaminhamentoJuridicoFiltros = {};
  const unidadeId = Number(searchParams.get("unidadeId"));
  if (Number.isFinite(unidadeId) && unidadeId > 0) filtros.unidadeId = unidadeId;
  const condominioId = Number(searchParams.get("condominioId"));
  if (Number.isFinite(condominioId) && condominioId > 0) filtros.condominioId = condominioId;
  const status = searchParams.get("status");
  if (status && status !== "todos") filtros.status = status;
  const advogado = searchParams.get("advogado");
  if (advogado && advogado !== "todos") filtros.advogado = advogado;
  return filtros;
}

function parseEncaminhamentoBody(body: unknown): EncaminhamentoJuridicoInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const condominioId = Number(record.condominioId);
  const unidadeId = Number(record.unidadeId);
  if (!Number.isFinite(condominioId) || !Number.isFinite(unidadeId)) return null;
  const advogadoResponsavel =
    typeof record.advogadoResponsavel === "string" ? record.advogadoResponsavel : undefined;
  const observacoes = typeof record.observacoes === "string" ? record.observacoes : undefined;
  const resumoContexto = typeof record.resumoContexto === "string" ? record.resumoContexto : undefined;
  const debitoIdsRaw = record.debitoIds;
  const debitoIds = Array.isArray(debitoIdsRaw)
    ? debitoIdsRaw.map((item) => Number(item)).filter((id) => Number.isFinite(id) && id > 0)
    : undefined;
  return { condominioId, unidadeId, advogadoResponsavel, observacoes, resumoContexto, debitoIds };
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "juridico", "ler");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  try {
    const encaminhamentos = listarEncaminhamentosJuridicos(session.userId, parseFiltros(searchParams));
    return Response.json({ encaminhamentos });
  } catch (error) {
    if (error instanceof JuridicoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar os encaminhamentos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "juridico", "criar");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parseEncaminhamentoBody(body);
  if (!input) {
    return Response.json({ error: "Dados do encaminhamento inválidos." }, { status: 400 });
  }

  try {
    const encaminhamento = criarEncaminhamentoJuridico(session.userId, input, requestMeta(request));
    return Response.json({ encaminhamento }, { status: 201 });
  } catch (error) {
    if (error instanceof JuridicoServiceError) {
      return Response.json({ error: error.message, detalhes: error.detalhes }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível registrar o encaminhamento." }, { status: 500 });
  }
}
