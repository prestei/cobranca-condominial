import bcrypt from "bcryptjs";
import { SENHA_DEMONSTRACAO } from "@/lib/auth/constants";

export function isPasswordHash(stored: string) {
  return stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$");
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, stored: string) {
  if (!stored) return false;
  if (isPasswordHash(stored)) {
    return bcrypt.compare(plain, stored);
  }
  if (stored === "definida") {
    return plain === SENHA_DEMONSTRACAO;
  }
  return plain === stored;
}
