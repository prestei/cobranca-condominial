import { isErrorResponse, requirePermissao, requireSession } from "@/lib/api/require-auth";
import {
  CondominioServiceError,
  criarCondominio,
  listarCondominios,
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
  const id = record.id !== undefined ? Number(record.id) : undefined;

  const str = (key: string) => (typeof record[key] === "string" ? (record[key] as string) : "");

  return {
    ...(Number.isFinite(id) ? { id } : {}),
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

export async function GET() {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "condominios", "ler");
  if (denied) return denied;
  const condominios = listarCondominios(session.userId);
  return Response.json({ condominios });
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePermissao(session, "condominios", "criar");
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const input = parseCondominioBody(body);
  if (!input) {
    return Response.json({ error: "Dados do condomínio inválidos." }, { status: 400 });
  }

  try {
    const condominio = criarCondominio(session.userId, input, requestMeta(request));
    return Response.json({ condominio }, { status: 201 });
  } catch (error) {
    if (error instanceof CondominioServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: "Não foi possível cadastrar o condomínio." }, { status: 500 });
  }
}
