import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  AcordoServiceError,
  PropostaNegociacaoServiceError,
  corrigirPagamentoAcordo,
  obterResumoAcordo,
  requestMeta,
  type PagamentoAcordoCorrecaoInput,
} from "@/lib/acordos/service";
import { getCadastros } from "@/data/catalogo";

type RouteContext = { params: Promise<{ id: string }> };

function parseCorrecaoBody(body: unknown): PagamentoAcordoCorrecaoInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const input: PagamentoAcordoCorrecaoInput = {};
  if (typeof record.valor === "string") input.valor = record.valor;
  if (typeof record.dataPagamento === "string") input.dataPagamento = record.dataPagamento;
  if (typeof record.referenciaComprovante === "string") input.referenciaComprovante = record.referenciaComprovante;
  if (typeof record.confirmacao === "string") input.confirmacao = record.confirmacao;
  if (
    input.valor === undefined &&
    input.dataPagamento === undefined &&
    input.referenciaComprovante === undefined &&
    input.confirmacao === undefined
  ) {
    return null;
  }
  return input;
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "atendimentos", "editar");
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

  const input = parseCorrecaoBody(body);
  if (!input) {
    return Response.json({ error: "Nenhum campo para correção." }, { status: 400 });
  }

  try {
    const pagamento = corrigirPagamentoAcordo(session.userId, id, input, requestMeta(request));
    const anterior = getCadastros().pagamentosAcordo.find((item) => item.id === id);
    const propostaId = anterior?.propostaId ?? pagamento.propostaId;
    const resumo = obterResumoAcordo(session.userId, propostaId);
    return Response.json({ pagamento, resumo });
  } catch (error) {
    if (error instanceof AcordoServiceError || error instanceof PropostaNegociacaoServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível corrigir o pagamento." }, { status: 500 });
  }
}
