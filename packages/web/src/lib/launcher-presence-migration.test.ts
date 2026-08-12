import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.resolve(
    process.cwd(),
    "packages/web/prisma/migrations/20260812152749_live_launcher_sessions/migration.sql",
  ),
  "utf8",
);
const prismaSchema = readFileSync(
  path.resolve(process.cwd(), "packages/web/prisma/schema.prisma"),
  "utf8",
);

describe("live launcher sessions migration", () => {
  it("enables RLS without granting public Data API policies", () => {
    expect(migration).toContain(
      'ALTER TABLE "launcher_client_sessions" ENABLE ROW LEVEL SECURITY',
    );
    expect(migration).toContain("FROM pg_roles WHERE rolname = 'anon'");
    expect(migration).not.toMatch(/CREATE\s+POLICY/i);
  });

  it("stores only a SHA-256 token hash and indexes active lookups", () => {
    expect(migration).toContain('"token_hash" TEXT NOT NULL');
    expect(migration).not.toMatch(/"token"\s+TEXT/i);
    expect(migration).toContain("launcher_client_sessions_active_idx");
    expect(migration).toContain('WHERE "closed_at" IS NULL');
    expect(migration).toContain("launcher_client_sessions_closed_cleanup_idx");
    expect(migration).toContain('WHERE "closed_at" IS NOT NULL');
  });

  it("constrains every state and remote command", () => {
    expect(migration).toContain("'open', 'in_game'");
    expect(migration).toContain("'stop_game', 'close_client'");
    expect(migration).toContain("launcher_client_sessions_command_check");
    expect(migration).toContain('"pending_command_reason" IS NOT NULL');
    expect(migration).toContain(
      "launcher_client_sessions_acknowledged_command_check",
    );
    expect(migration).toMatch(/pending_command_id" ~\*/);
  });

  it("keeps the command actor foreign key restrictive in schema and SQL", () => {
    expect(prismaSchema).toMatch(
      /pendingCommandBy\s+User\?[\s\S]*?onDelete:\s*Restrict/,
    );
    expect(migration).toMatch(
      /launcher_client_sessions_pending_command_by_id_fkey[\s\S]*?ON DELETE RESTRICT ON UPDATE CASCADE/,
    );
  });
});
