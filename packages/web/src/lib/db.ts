import { PrismaClient } from "@prisma/client";
import { normalizeRuntimeDatabaseUrl } from "./database-url";

// Singleton Prisma : évite d'ouvrir trop de connexions en dev (hot reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const datasourceUrl = normalizeRuntimeDatabaseUrl(process.env.DATABASE_URL);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
