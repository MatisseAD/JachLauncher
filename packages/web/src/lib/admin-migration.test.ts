import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL(
    "../../prisma/migrations/20260810000000_admin_control_plane/migration.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("migration du plan de contrôle administrateur", () => {
  it.each([
    '"User"',
    '"Launcher"',
    '"LauncherDailyMetric"',
    '"UserUploadUsage"',
    '"player_bans"',
    '"admin_audit_logs"',
  ])("active RLS sans policy Data API sur %s", (table) => {
    expect(migration).toContain(
      `ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`,
    );
    expect(migration.toUpperCase()).not.toContain("CREATE POLICY");
  });

  it("protège le journal contre update, delete et truncate", () => {
    expect(migration).toContain(
      'BEFORE UPDATE OR DELETE ON "admin_audit_logs"',
    );
    expect(migration).toContain('BEFORE TRUNCATE ON "admin_audit_logs"');
    expect(migration).toContain("ON DELETE RESTRICT ON UPDATE CASCADE");
  });

  it("indexe chaque nouvelle clé étrangère", () => {
    for (const index of [
      '"User_disabledById_idx"',
      '"Launcher_suspendedById_idx"',
      '"player_bans_launcher_id_idx"',
      '"player_bans_created_by_id_idx"',
      '"player_bans_revoked_by_id_idx"',
      '"admin_audit_logs_actor_id_idx"',
    ]) {
      expect(migration).toContain(`CREATE INDEX ${index}`);
    }
  });

  it("indexe les filtres de métriques et d'autorisation fréquents", () => {
    for (const index of [
      '"User_disabledAt_idx"',
      '"User_role_disabledAt_idx"',
      '"User_lastLoginAt_idx"',
      '"Launcher_suspendedAt_idx"',
      '"player_bans_access_idx"',
    ]) {
      expect(migration).toContain(`CREATE INDEX ${index}`);
    }
  });
});
