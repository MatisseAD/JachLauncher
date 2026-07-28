import { describe, expect, it } from "vitest";
import { normalizeRuntimeDatabaseUrl } from "./database-url";

describe("normalizeRuntimeDatabaseUrl", () => {
  it("configure le pooler transactionnel Supabase pour Prisma", () => {
    const normalized = normalizeRuntimeDatabaseUrl(
      "postgresql://user:pass@aws-0-eu.pooler.supabase.com:6543/postgres",
    );
    const url = new URL(normalized!);

    expect(url.searchParams.get("schema")).toBe("jach_launcher");
    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("1");
  });

  it("préserve un schéma et une limite explicitement configurés", () => {
    const normalized = normalizeRuntimeDatabaseUrl(
      "postgresql://user:pass@aws-0-eu.pooler.supabase.com:6543/postgres?schema=custom&connection_limit=3",
    );
    const url = new URL(normalized!);

    expect(url.searchParams.get("schema")).toBe("custom");
    expect(url.searchParams.get("connection_limit")).toBe("3");
    expect(url.searchParams.get("pgbouncer")).toBe("true");
  });

  it("laisse les autres fournisseurs inchangés", () => {
    const configured =
      "postgresql://user:pass@database.example.com:5432/app?schema=public";
    expect(normalizeRuntimeDatabaseUrl(configured)).toBe(configured);
  });

  it("laisse Prisma expliquer une URL invalide", () => {
    expect(normalizeRuntimeDatabaseUrl("not-a-postgres-url")).toBe(
      "not-a-postgres-url",
    );
    expect(normalizeRuntimeDatabaseUrl(undefined)).toBeUndefined();
  });
});
