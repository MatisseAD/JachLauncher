import { PrismaClient } from "@prisma/client";

// Singleton Prisma : évite d'ouvrir trop de connexions en dev (hot reload).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function runtimeDatabaseUrl(): string | undefined {
  const configured = process.env.DATABASE_URL;
  if (!configured) return undefined;
  try {
    const url = new URL(configured);
    const isSupabase =
      url.hostname.endsWith(".supabase.com") ||
      url.hostname.endsWith(".supabase.co");
    if (
      isSupabase &&
      (!url.searchParams.get("schema") ||
        url.searchParams.get("schema") === "public")
    ) {
      url.searchParams.set("schema", "jach_launcher");
      return url.toString();
    }
  } catch {
    // Prisma produira l'erreur de connexion détaillée avec la valeur d'origine.
  }
  return configured;
}

const datasourceUrl = runtimeDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(datasourceUrl ? { datasources: { db: { url: datasourceUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
