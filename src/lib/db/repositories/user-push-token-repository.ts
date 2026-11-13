import { prisma } from "@/lib/db/prisma";

export type UserPushTokenRecord = {
  id: number;
  userId: number;
  fcmToken: string;
  userAgent: string | null;
  createdAt: Date;
  lastUsedAt: Date;
};

export async function listPushTokensByUserId(userId: number): Promise<UserPushTokenRecord[]> {
  const rows = await prisma.userPushToken.findMany({ where: { userId }, orderBy: { id: "asc" } });
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    fcmToken: row.fcmToken,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
  }));
}

export async function upsertPushTokenForUser(input: {
  userId: number;
  fcmToken: string;
  userAgent: string | null;
  now: Date;
}): Promise<UserPushTokenRecord> {
  const row = await prisma.userPushToken.upsert({
    where: { fcmToken: input.fcmToken },
    create: {
      userId: input.userId,
      fcmToken: input.fcmToken,
      userAgent: input.userAgent,
      createdAt: input.now,
      lastUsedAt: input.now,
    },
    update: {
      userId: input.userId,
      userAgent: input.userAgent,
      lastUsedAt: input.now,
    },
  });
  return {
    id: row.id,
    userId: row.userId,
    fcmToken: row.fcmToken,
    userAgent: row.userAgent,
    createdAt: row.createdAt,
    lastUsedAt: row.lastUsedAt,
  };
}

export async function deletePushTokenByValue(fcmToken: string, userId: number): Promise<boolean> {
  const resultado = await prisma.userPushToken.deleteMany({
    where: { fcmToken, userId },
  });
  return resultado.count > 0;
}

export async function deletePushTokensByValues(tokens: string[]): Promise<number> {
  if (tokens.length === 0) return 0;
  const resultado = await prisma.userPushToken.deleteMany({
    where: { fcmToken: { in: tokens } },
  });
  return resultado.count;
}
