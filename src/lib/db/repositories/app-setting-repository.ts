import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@prisma/client";

/** Lê configuração JSON persistida em `app_setting`. */
export async function getAppSetting<T = unknown>(key: string): Promise<T | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  if (!row) return null;
  return row.value as T;
}

/** Grava ou atualiza configuração JSON em `app_setting`. */
export async function setAppSetting(key: string, value: Prisma.InputJsonValue): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value, updatedAt: new Date() },
  });
}
