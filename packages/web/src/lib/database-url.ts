const SUPABASE_APP_SCHEMA = "jach_launcher";

function isSupabaseHost(hostname: string): boolean {
  return (
    hostname.endsWith(".supabase.com") || hostname.endsWith(".supabase.co")
  );
}

/**
 * Adapte une URL Supabase au runtime serverless Prisma :
 * - schéma privé à l'application ;
 * - statements nommés désactivés pour le pooler Transaction ;
 * - une seule connexion par instance de fonction.
 */
export function normalizeRuntimeDatabaseUrl(
  configured: string | undefined,
): string | undefined {
  if (!configured) return undefined;
  try {
    const url = new URL(configured);
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
  } catch {
    // Prisma produira ensuite l'erreur de connexion détaillée.
    return configured;
  }
}
