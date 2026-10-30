const CHAVES_SENSIVEIS = new Set([
  "senha",
  "password",
  "token",
  "access_token",
  "refresh_token",
  "secret",
  "authorization",
  "permissao_json",
]);

const MARCADOR_REDACT = "[omitido]";

function redactValue(key: string, value: unknown): unknown {
  const chave = key.trim().toLowerCase();
  if (CHAVES_SENSIVEIS.has(chave)) return MARCADOR_REDACT;
  if (typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value)) return MARCADOR_REDACT;
  if (Array.isArray(value)) return value.map((item, index) => redactValue(String(index), item));
  if (value && typeof value === "object") return redactObject(value as Record<string, unknown>);
  return value;
}

function redactObject(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    out[key] = redactValue(key, value);
  }
  return out;
}

export function sanitizarTextoAuditoria(raw: string): string {
  const texto = raw.trim();
  if (!texto) return texto;
  try {
    const parsed = JSON.parse(texto) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return JSON.stringify(redactObject(parsed as Record<string, unknown>));
    }
    if (Array.isArray(parsed)) {
      return JSON.stringify(parsed.map((item, index) => redactValue(String(index), item)));
    }
    return texto;
  } catch {
    return texto.replace(/\$2[aby]\$\d{2}\$[^\s"']+/g, MARCADOR_REDACT);
  }
}

export function sanitizarCamposAlterados(campos: string): string {
  return campos
    .split(",")
    .map((parte) => parte.trim())
    .filter(Boolean)
    .map((campo) => {
      const chave = campo.toLowerCase();
      if (chave === "senha" || chave === "password") return "credencial_acesso";
      if (CHAVES_SENSIVEIS.has(chave)) return "credencial_acesso";
      return campo;
    })
    .join(", ");
}
