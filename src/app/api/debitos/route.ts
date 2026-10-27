import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  DebitoServiceError,
  criarDebito,
  listarDebitos,
  requestMeta,
  type DebitoFiltros,
  type DebitoInput,
} from "@/lib/debitos/service";

function parseFiltros(searchParams: URLSearchParams): DebitoFiltros {
  const filtros: DebitoFiltros = {};
  const condominioId = Number(searchParams.get("condominioId"));
  if (Number.isFinite(condominioId) && condominioId > 0) filtros.condominioId = condominioId;
  const unidadeId = Number(searchParams.get("unidadeId"));
  if (Number.isFinite(unidadeId) && unidadeId > 0) filtros.unidadeId = unidadeId;
  const status = searchParams.get("status");
  if (status && status !== "todos") filtros.status = status;
  const origem = searchParams.get("origem");
  if (origem && origem !== "todas") filtros.origem = origem;
  const busca = searchParams.get("q") ?? searchParams.get("busca");
  if (busca?.trim()) filtros.busca = busca.trim();
  const vencimentoDe = searchParams.get("vencimentoDe");
  if (vencimentoDe?.trim()) filtros.vencimentoDe = vencimentoDe.trim();
  const vencimentoAte = searchParams.get("vencimentoAte");
  if (vencimentoAte?.trim()) filtros.vencimentoAte = vencimentoAte.trim();
  return filtros;
}

function parseDebitoBody(body: unknown): DebitoInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const condominioId = Number(record.condominioId);
  const unidadeId = Number(record.unidadeId);
  if (!Number.isFinite(condominioId) || !Number.isFinite(unidadeId)) return null;
  const referencia = typeof record.referencia === "string" ? record.referencia : "";
  const dataVencimento = typeof record.dataVencimento === "string" ? record.dataVencimento : "";
  const status = typeof record.status === "string" ? record.status : "";
  return {
    condominioId,
    unidadeId,
    referencia,
    descricao: typeof record.descricao === "string" ? record.descricao : undefined,
    dataVencimento,
    valor: typeof record.valor === "string" ? record.valor : undefined,
    valorOriginal: typeof record.valorOriginal === "string" ? record.valorOriginal : undefined,
    multa: typeof record.multa === "string" ? record.multa : undefined,
    juros: typeof record.juros === "string" ? record.juros : undefined,
    correcao: typeof record.correcao === "string" ? record.correcao : undefined,
    valorAtualizado: typeof record.valorAtualizado === "string" ? record.valorAtualizado : undefined,
    status,
    dataPagamento: typeof record.dataPagamento === "string" ? record.dataPagamento : undefined,
    valorPago: typeof record.valorPago === "string" ? record.valorPago : undefined,
    origem: typeof record.origem === "string" ? record.origem : undefined,
    identificadorExterno: typeof record.identificadorExterno === "string" ? record.identificadorExterno : undefined,
  };
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "debitos", "ler");
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  try {
    const debitos = listarDebitos(session.userId, parseFiltros(searchParams));
    return Response.json({ debitos });
  } catch (error) {
    if (error instanceof DebitoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar os débitos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "debitos", "criar");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parseDebitoBody(body);
  if (!input) {
    return Response.json({ error: "Dados do débito inválidos." }, { status: 400 });
  }

  try {
    const debito = criarDebito(session.userId, input, requestMeta(request));
    return Response.json({ debito }, { status: 201 });
  } catch (error) {
    if (error instanceof DebitoServiceError) {
      return Response.json({ error: error.message, detalhes: error.detalhes }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível cadastrar o débito." }, { status: 500 });
  }
}
