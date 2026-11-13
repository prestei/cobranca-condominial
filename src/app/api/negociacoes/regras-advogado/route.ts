import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { requireAdministradora, requirePropostaLer } from "@/lib/api/require-proposta-auth";
import {
  findLawyerNegotiationRule,
  getLawyerNegotiationRuleEffective,
  upsertLawyerNegotiationRule,
} from "@/lib/db/repositories/lawyer-negotiation-rule-repository";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";

function parseUsuarioId(searchParams: URLSearchParams): number | null {
  const id = Number(searchParams.get("usuarioId"));
  return Number.isFinite(id) && id > 0 ? id : null;
}

export async function GET(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const denied = await requirePropostaLer(session);
  if (denied) return denied;

  const usuarioId = parseUsuarioId(new URL(request.url).searchParams);
  if (usuarioId == null) {
    return Response.json({ error: "Informe usuarioId." }, { status: 400 });
  }

  const regra = await getLawyerNegotiationRuleEffective(usuarioId);
  const personalizada = await findLawyerNegotiationRule(usuarioId);
  return Response.json({ regra, personalizada: Boolean(personalizada) });
}

export async function PATCH(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;
  const deniedAdmin = await requireAdministradora(session);
  if (deniedAdmin) return deniedAdmin;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const record = body as Record<string, unknown>;
  const usuarioId = Number(record.usuarioId);
  const descontoMaximoPercent =
    typeof record.descontoMaximoPercent === "string" ? record.descontoMaximoPercent : "";
  const parcelasMaximas = Number(record.parcelasMaximas);

  if (!Number.isFinite(usuarioId) || usuarioId <= 0) {
    return Response.json({ error: "usuarioId inválido." }, { status: 400 });
  }
  const desconto = Number(descontoMaximoPercent.replace(",", "."));
  if (!Number.isFinite(desconto) || desconto < 0 || desconto > 100) {
    return Response.json({ error: "Desconto máximo deve estar entre 0 e 100." }, { status: 400 });
  }
  if (!Number.isFinite(parcelasMaximas) || parcelasMaximas < 1) {
    return Response.json({ error: "Parcelas máximas inválidas." }, { status: 400 });
  }

  const anterior = await findLawyerNegotiationRule(usuarioId);
  const regra = await upsertLawyerNegotiationRule(
    usuarioId,
    { descontoMaximoPercent: desconto.toFixed(2), parcelasMaximas: Math.floor(parcelasMaximas) },
    session.userId,
  );

  await writeAuditLog({
    entity: "lawyer_negotiation_rule",
    recordId: String(usuarioId),
    action: anterior ? "UPDATE" : "INSERT",
    previousData: anterior ? JSON.stringify(anterior) : "",
    newData: JSON.stringify(regra),
    changedFields: "desconto_maximo_percent, parcelas_maximas",
    userId: session.userId,
  });

  return Response.json({ regra });
}
