import { montarConhecimentoAssistente } from "@/lib/ajuda/assistant-knowledge";
import { montarMensagensAssistente, type MensagemHistorico } from "@/lib/ajuda/assistant-prompt";
import { isErrorResponse, requireSession } from "@/lib/api/require-auth";
import { resolverPerfilOperacional } from "@/lib/perfil-operacional";
import { chatCompletion, openRouterConfigured } from "@/lib/openrouter/client";
import { resolverPermissoesUsuario } from "@/lib/permissions/resolver";

const MAX_PERGUNTA = 2_000;
const MAX_CONTEXTO = 4_000;

type BodyPayload = {
  pergunta?: string;
  pathname?: string;
  contextoTela?: string;
  historico?: MensagemHistorico[];
};

function parseHistorico(raw: unknown): MensagemHistorico[] {
  if (!Array.isArray(raw)) return [];
  const out: MensagemHistorico[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as { role?: unknown; content?: unknown };
    if (record.role !== "user" && record.role !== "assistant") continue;
    if (typeof record.content !== "string" || !record.content.trim()) continue;
    out.push({ role: record.role, content: record.content.trim().slice(0, 4_000) });
  }
  return out.slice(-8);
}

export async function POST(request: Request) {
  const session = await requireSession();
  if (isErrorResponse(session)) return session;

  if (!openRouterConfigured()) {
    return Response.json(
      {
        error:
          "O assistente inteligente não está configurado. Peça à administradora para definir OPENROUTER_API_KEY no servidor.",
      },
      { status: 503 },
    );
  }

  let body: BodyPayload;
  try {
    body = (await request.json()) as BodyPayload;
  } catch {
    return Response.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const pergunta = typeof body.pergunta === "string" ? body.pergunta.trim() : "";
  if (!pergunta || pergunta.length > MAX_PERGUNTA) {
    return Response.json({ error: "Escreva uma pergunta (até 2.000 caracteres)." }, { status: 400 });
  }

  const pathname = typeof body.pathname === "string" && body.pathname.startsWith("/") ? body.pathname : "/";
  const contextoTela =
    typeof body.contextoTela === "string" && body.contextoTela.trim()
      ? body.contextoTela.trim().slice(0, MAX_CONTEXTO)
      : null;
  const historico = parseHistorico(body.historico);

  const permissoes = await resolverPermissoesUsuario(session.userId);
  const perfil = resolverPerfilOperacional(permissoes);

  try {
    const conhecimento = await montarConhecimentoAssistente({ pathname, permissoes, perfil });
    const messages = montarMensagensAssistente({
      user: session,
      perfil,
      pathname,
      contextoTela,
      pergunta,
      historico,
      conhecimento,
    });
    const resposta = await chatCompletion(messages);
    return Response.json({ resposta });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Não foi possível obter resposta.";
    if (msg === "OPENROUTER_NOT_CONFIGURED") {
      return Response.json({ error: "Assistente não configurado no servidor." }, { status: 503 });
    }
    return Response.json({ error: "Não foi possível consultar o assistente. Tente de novo em instantes." }, { status: 502 });
  }
}
