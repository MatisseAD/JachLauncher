import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const mutationRoutes = [
  "../app/api/admin/users/[id]/route.ts",
  "../app/api/admin/launchers/[id]/route.ts",
  "../app/api/admin/player-bans/route.ts",
  "../app/api/admin/player-bans/[id]/route.ts",
];

describe("invariants des mutations administrateur", () => {
  it.each(mutationRoutes)(
    "%s revalide l'acteur sous verrou avant la première écriture",
    (relativePath) => {
      const source = readFileSync(
        new URL(relativePath, import.meta.url),
        "utf8",
      );
      const revalidation = source.indexOf(
        "lockAndRevalidateAdmin(tx, admin.userId)",
      );
      const firstWrite = Math.min(
        ...[
          "tx.user.update",
          "tx.launcher.update",
          "tx.playerBan.update",
          "tx.playerBan.create",
        ]
          .map((needle) => source.indexOf(needle))
          .filter((position) => position >= 0),
      );
      expect(revalidation).toBeGreaterThan(0);
      expect(revalidation).toBeLessThan(firstWrite);
      expect(source).toContain("isAllowedAdminMutationOrigin(request)");
      expect(source).toContain("consumeRateLimit(request");
      expect(source).toContain("appendAdminAudit(tx");
    },
  );

  it("verrouille les rôles admin dans un ordre déterministe", () => {
    const source = readFileSync(new URL("./admin.ts", import.meta.url), "utf8");
    expect(source).toContain("WHERE \"role\" = 'admin'");
    expect(source).toContain('ORDER BY "id"');
    expect(source).toContain("FOR UPDATE");
    expect(source).toContain(
      "isActiveAdminRecord(actor.role, actor.disabledAt)",
    );
  });
});
