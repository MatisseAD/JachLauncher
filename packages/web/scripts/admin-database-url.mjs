import { URL } from "node:url";

const SUPABASE_APP_SCHEMA = "jach_launcher";

function isSupabaseHost(hostname) {
  return (
    hostname.endsWith(".supabase.com") || hostname.endsWith(".supabase.co")
  );
}

/** Keep the bootstrap CLI on the exact same schema/pool settings as web Prisma. */
export function normalizeAdminDatabaseUrl(configured) {
  if (!configured) throw new Error("DATABASE_URL est absente.");

  let url;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("DATABASE_URL n'est pas une URL valide.");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("DATABASE_URL doit utiliser PostgreSQL.");
  }
  if (!isSupabaseHost(url.hostname)) return configured;

  if (
    !url.searchParams.get("schema") ||
    url.searchParams.get("schema") === "public"
  ) {
    url.searchParams.set("schema", SUPABASE_APP_SCHEMA);
  }
  if (url.port === "6543") {
    url.searchParams.set("pgbouncer", "true");
    if (!url.searchParams.has("connection_limit")) {
      url.searchParams.set("connection_limit", "1");
    }
  }
  return url.toString();
}
