import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import { requestMeta, UnidadeServiceError, vincularResponsavel, type VinculoInput } from "@/lib/unidades/service";

function parseId(raw: string) {
  const id = Number(raw);
  if (!Number.isFinite(id) || id <= 0) return null;
  return id;
}

function parseVinculoBody(body: unknown): VinculoInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const tipoVinculo = typeof record.tipoVinculo === "string" ? record.tipoVinculo : "";
  const principal = record.principal === true;
  const observacoes = typeof record.observacoes === "string" ? record.observacoes : "";
  const responsavelId =
    record.responsavelId !== undefined && record.responsavelId !== null ? Number(record.responsavelId) : undefined;

  let responsavel: VinculoInput["responsavel"];
  if (record.responsavel && typeof record.responsavel === "object") {
    const r = record.responsavel as Record<string, unknown>;
    responsavel = {
      nome: typeof r.nome === "string" ? r.nome : "",
      cpfCnpj: typeof r.cpfCnpj === "string" ? r.cpfCnpj : "",
      tipoPessoa: typeof r.tipoPessoa === "string" ? r.tipoPessoa : "Fisica",
      telefone: typeof r.telefone === "string" ? r.telefone : "",
      whatsapp: typeof r.whatsapp === "string" ? r.whatsapp : "",
      email: typeof r.email === "string" ? r.email : "",
      endereco: typeof r.endereco === "string" ? r.endereco : "",
      observacoes: typeof r.observacoes === "string" ? r.observacoes : "",
    };
  }

  if (!tipoVinculo) return null;
  return { tipoVinculo, principal, observacoes, responsavelId, responsavel };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "unidades", "editar");
  if (denied) return denied;

  const { id: rawId } = await context.params;
  const unidadeId = parseId(rawId);
  if (unidadeId === null) {
    return Response.json({ error: "Identificador inválido." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parseVinculoBody(body);
  if (!input) {
    return Response.json({ error: "Dados do vínculo inválidos." }, { status: 400 });
  }

  try {
    const vinculo = vincularResponsavel(session.userId, unidadeId, input, requestMeta(request));
    return Response.json({ vinculo }, { status: 201 });
  } catch (error) {
    if (error instanceof UnidadeServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível vincular o responsável." }, { status: 500 });
  }
}
