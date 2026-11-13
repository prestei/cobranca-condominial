type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterChoice = {
  message?: { content?: string };
};

type OpenRouterResponse = {
  choices?: OpenRouterChoice[];
  error?: { message?: string };
};

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

/** Modelos com sufixo de busca na web (:online etc.) não são permitidos no assistente interno. */
export function resolveAssistenteModel(raw: string | undefined): string {
  const trimmed = raw?.trim() || DEFAULT_MODEL;
  const semPlugins = trimmed.replace(/:online$/i, "").replace(/:web$/i, "");
  return semPlugins || DEFAULT_MODEL;
}

export function openRouterConfigured(): boolean {
  const key = process.env.OPENROUTER_API_KEY?.trim();
  return Boolean(key && key.length > 8);
}

export async function chatCompletion(messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_NOT_CONFIGURED");
  }

  const model = resolveAssistenteModel(process.env.OPENROUTER_MODEL);
  const siteUrl = process.env.OPENROUTER_SITE_URL?.trim();
  const appName = process.env.OPENROUTER_APP_NAME?.trim() || "Cobrança Condominial";

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
  if (siteUrl) headers["HTTP-Referer"] = siteUrl;
  if (appName) headers["X-Title"] = appName;

  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.25,
      max_tokens: 1200,
    }),
  });

  const data = (await response.json()) as OpenRouterResponse;
  if (!response.ok) {
    const msg = data.error?.message ?? `OpenRouter respondeu com status ${response.status}.`;
    throw new Error(msg);
  }

  const text = data.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Resposta vazia do assistente.");
  }
  return text;
}
