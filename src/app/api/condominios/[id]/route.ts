import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  alterarStatusCondominio,
  atualizarCondominio,
  CondominioServiceError,
  excluirCondominio,
  requestMeta,
  type CondominioInput,
} from "@/lib/condominios/service";
import { statusCondominio, type StatusCondominio } from "@/data/catalogo";

function parseCondominioBody(body: unknown): CondominioInput | null {
  if (!body || typeof body !== "object") return null;
  const record = body as Record<string, unknown>;
  const nome = typeof record.nome === "string" ? record.nome : "";
  const identificadorExterno = typeof record.identificadorExterno === "string" ? record.identificadorExterno : "";
  const advogadosRaw = record.advogados;
  const advogados =
    Array.isArray(advogadosRaw) && advogadosRaw.every((item) => typeof item === "string")
      ? (advogadosRaw as string[])
      : [];
  const statusRaw = typeof record.status === "string" ? record.status : "Ativo";
  const status = statusCondominio.includes(statusRaw as StatusCondominio)
    ? (statusRaw as StatusCondominio)
    : "Ativo";

  const str = (key: string) => (typeof record[key] === "string" ? (record[key] as string) : "");

  return {
    nome,
    identificadorExterno,
    status,
    advogados,
    administradora: str("administradora"),
    cep: str("cep"),
    logradouro: str("logradouro"),
    numero: str("numero"),
    complemento: str("complemento"),
    cidade: str("cidade"),
    estado: str("estado"),
    observacao: str("observacao"),
  };
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "condominios", "excluir");
  if (denied) return denied;

  const { id: idParam } = await context.params;
  const condominioId = Number(idParam);
  if (!Number.isFinite(condominioId)) {
    return Response.json({ error: "Condomínio inválido." }, { status: 400 });
  }

  try {
    excluirCondominio(session.userId, condominioId, requestMeta(_request));
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof CondominioServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível excluir o condomínio." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "condominios", "editar");
  if (denied) return denied;

  const { id: idParam } = await context.params;
  const condominioId = Number(idParam);
  if (!Number.isFinite(condominioId)) {
    return Response.json({ error: "Condomínio inválido." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  if (body && typeof body === "object" && "status" in body && Object.keys(body as object).length === 1) {
    const status = (body as { status: string }).status;
    if (!statusCondominio.includes(status as StatusCondominio)) {
      return Response.json({ error: "Situação do condomínio inválida." }, { status: 400 });
    }
    try {
      const condominio = alterarStatusCondominio(
        session.userId,
        condominioId,
        status as StatusCondominio,
        requestMeta(request),
      );
      return Response.json({ condominio });
    } catch (error) {
      if (error instanceof CondominioServiceError) {
        return Response.json({ error: error.message }, { status: error.status });
      }
      return Response.json({ error: "Não foi possível atualizar o condomínio." }, { status: 500 });
    }
  }

  const input = parseCondominioBody(body);
  if (!input) {
    return Response.json({ error: "Dados do condomínio inválidos." }, { status: 400 });
  }

  try {
    const condominio = atualizarCondominio(session.userId, condominioId, input, requestMeta(request));
    return Response.json({ condominio });
  } catch (error) {
    if (error instanceof CondominioServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível atualizar o condomínio." }, { status: 500 });
  }
}
