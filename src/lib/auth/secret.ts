const DEV_FALLBACK_SECRET = "dev-only-auth-secret-min-32-characters!!";

export function getAuthSecretBytes(): Uint8Array {
  const raw = process.env.AUTH_SECRET ?? (process.env.NODE_ENV === "development" ? DEV_FALLBACK_SECRET : undefined);
  if (!raw || raw.length < 32) {
    throw new Error("AUTH_SECRET deve ter pelo menos 32 caracteres. Defina em .env.local (veja .env.example).");
  }
  return new TextEncoder().encode(raw);
}
