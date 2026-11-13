import { AVATAR_SERVER_MAX_LENGTH } from "@/lib/avatar/constants";

const AVATAR_MIME_PREFIX = /^data:image\/(jpeg|jpg|png|webp);base64,/i;

/**
 * Valida data URL de avatar para persistência.
 * Retorna `null` quando o valor é vazio (remover avatar).
 */
export function normalizarAvatarDataUrl(input: unknown): string | null {
  if (input === null || input === "") return null;
  if (typeof input !== "string") {
    throw new Error("Formato de imagem inválido.");
  }
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (!AVATAR_MIME_PREFIX.test(trimmed)) {
    throw new Error("Use uma imagem JPEG, PNG ou WebP.");
  }
  if (trimmed.length > AVATAR_SERVER_MAX_LENGTH) {
    throw new Error("A foto está grande demais. Envie uma imagem mais leve.");
  }
  const payload = trimmed.slice(trimmed.indexOf(",") + 1);
  if (!payload || !/^[A-Za-z0-9+/]+=*$/.test(payload)) {
    throw new Error("Imagem corrompida ou inválida.");
  }
  return trimmed;
}
