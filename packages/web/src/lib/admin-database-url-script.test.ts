import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeAdminDatabaseUrl } from "../../scripts/admin-database-url.mjs";
import { normalizeRuntimeDatabaseUrl } from "./database-url";

describe("normalizeAdminDatabaseUrl", () => {
  it("cible le schéma applicatif via le pooler Supabase", () => {
    const result = normalizeAdminDatabaseUrl(
      "postgresql://user:pass@aws-0-eu.pooler.supabase.com:6543/postgres",
    );
    const url = new URL(result);
    expect(url.searchParams.get("schema")).toBe("jach_launcher");
    expect(url.searchParams.get("pgbouncer")).toBe("true");
    expect(url.searchParams.get("connection_limit")).toBe("1");
  });

  it("ajoute le schéma à une connexion Supabase directe", () => {
    const result = normalizeAdminDatabaseUrl(
      "postgresql://user:pass@db.project.supabase.co:5432/postgres",
    );
    expect(new URL(result).searchParams.get("schema")).toBe("jach_launcher");
  });

  it("préserve un schéma explicite et les fournisseurs non Supabase", () => {
    const custom = normalizeAdminDatabaseUrl(
      "postgresql://user:pass@db.project.supabase.co:5432/postgres?schema=custom",
    );
    expect(new URL(custom).searchParams.get("schema")).toBe("custom");

    const external =
      "postgresql://user:pass@database.example:5432/app?schema=public";
    expect(normalizeAdminDatabaseUrl(external)).toBe(external);
  });

  it("reste strictement aligné sur le résolveur du runtime Prisma", () => {
    const urls = [
      "postgresql://user:pass@aws-0-eu.pooler.supabase.com:6543/postgres",
      "postgresql://user:pass@aws-0-eu.pooler.supabase.com:6543/postgres?schema=custom&connection_limit=3",
      "postgresql://user:pass@db.project.supabase.co:5432/postgres?schema=public",
      "postgresql://user:pass@database.example:5432/app?schema=public",
    ];

    for (const configured of urls) {
      expect(normalizeAdminDatabaseUrl(configured)).toBe(
        normalizeRuntimeDatabaseUrl(configured),
      );
    }
  });

  it("refuse une configuration absente ou non PostgreSQL", () => {
    expect(() => normalizeAdminDatabaseUrl(undefined)).toThrow(
      "DATABASE_URL est absente",
    );
    expect(() => normalizeAdminDatabaseUrl("https://example.test")).toThrow(
      "doit utiliser PostgreSQL",
    );
  });

  it("est utilisé par le bootstrap avant de construire PrismaClient", () => {
    const script = readFileSync(
      new URL("../../scripts/grant-admin.mjs", import.meta.url),
      "utf8",
    );
    const normalize = script.indexOf(
      "normalizeAdminDatabaseUrl(process.env.DATABASE_URL)",
    );
    const client = script.indexOf("new PrismaClient");
    expect(normalize).toBeGreaterThan(client);
    expect(script).toContain("datasources");
    expect(script).toContain("actorId: null");
    expect(script).toContain("promotedUserId: user.id");
    expect(script).not.toContain("actorId: user.id");
  });
});
