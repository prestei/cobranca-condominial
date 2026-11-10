import { PrismaClient } from "@prisma/client";

/**
 * Cliente Prisma singleton.
 * O `globalThis` evita múltiplos pools no hot-reload do Next — não guarda dados de negócio.
 */
const globalForPrisma = globalThis as typeof globalThis & {
  __cobrancaPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.__cobrancaPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__cobrancaPrisma = prisma;
}

export type { PrismaClient, Prisma } from "@prisma/client";
