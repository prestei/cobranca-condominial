import { SignJWT, jwtVerify } from "jose";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/auth/constants";
import { getAuthSecretBytes } from "@/lib/auth/secret";
import type { SessionUser } from "@/lib/auth/types";

function claimsFromPayload(payload: Record<string, unknown>): SessionUser | null {
  const userId = payload.userId;
  const email = payload.email;
  const nome = payload.nome;
  const cargoId = payload.cargoId;
  if (
    typeof userId !== "number" ||
    typeof email !== "string" ||
    typeof nome !== "string" ||
    typeof cargoId !== "number"
  ) {
    return null;
  }
  return { userId, email, nome, cargoId };
}

export async function signSessionToken(user: SessionUser) {
  return new SignJWT({
    userId: user.userId,
    email: user.email,
    nome: user.nome,
    cargoId: user.cargoId,
    sub: String(user.userId),
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getAuthSecretBytes());
}

export async function readSessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecretBytes());
    return claimsFromPayload(payload as Record<string, unknown>);
  } catch {
    return null;
  }
}
