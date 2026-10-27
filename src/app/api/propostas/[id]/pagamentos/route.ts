import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  AcordoServiceError,
  PropostaNegociacaoServiceError,
  listarPagamentosAcordo,
  obterResumoAcordo,
  registrarPagamentoAcordo,
  requestMeta,
  type PagamentoAcordoInput,
} from "@/lib/acordos/service";

type RouteContext = { params: Promise<{ id: string }> };

function parsePagamentoBody(body: unknown): PagamentoAcordoInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const parcelaId = typeof record.parcelaId === "string" ? record.parcelaId : "";
  const valor = typeof record.valor === "string" ? record.valor : "";
  const dataPagamento = typeof record.dataPagamento === "string" ? record.dataPagamento : "";
  const referenciaComprovante =
    typeof record.referenciaComprovante === "string" ? record.referenciaComprovante : undefined;
  const confirmacao = typeof record.confirmacao === "string" ? record.confirmacao : undefined;
  if (!parcelaId.trim() || !valor.trim() || !dataPagamento.trim()) return null;
  return { parcelaId, valor, dataPagamento, referenciaComprovante, confirmacao };
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "atendimentos", "ler");
  if (denied) return denied;

  const { id } = await context.params;
  if (!id?.trim()) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  try {
    const pagamentos = listarPagamentosAcordo(session.userId, id);
    const resumo = obterResumoAcordo(session.userId, id);
    return Response.json({ pagamentos, resumo });
  } catch (error) {
    if (error instanceof AcordoServiceError || error instanceof PropostaNegociacaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível carregar os pagamentos." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "atendimentos", "criar");
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

  const input = parsePagamentoBody(body);
  if (!input) {
    return Response.json({ error: "Dados do pagamento inválidos." }, { status: 400 });
  }

  try {
    const pagamento = registrarPagamentoAcordo(session.userId, id, input, requestMeta(request));
    const resumo = obterResumoAcordo(session.userId, id);
    return Response.json({ pagamento, resumo }, { status: 201 });
  } catch (error) {
    if (error instanceof AcordoServiceError || error instanceof PropostaNegociacaoServiceError) {
      return Response.json({ error: error.message, detalhes: error.detalhes }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível registrar o pagamento." }, { status: 500 });
  }
}
