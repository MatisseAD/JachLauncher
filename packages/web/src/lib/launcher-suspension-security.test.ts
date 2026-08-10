import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const launcherRoute = readFileSync(
  new URL("../app/api/launchers/[id]/route.ts", import.meta.url),
  "utf8",
);
const duplicateRoute = readFileSync(
  new URL("../app/api/launchers/[id]/duplicate/route.ts", import.meta.url),
  "utf8",
);
const playerBanRoute = readFileSync(
  new URL("../app/api/admin/player-bans/route.ts", import.meta.url),
  "utf8",
);

function expectGuardBefore(source: string, write: string) {
  const lock = source.indexOf("FOR UPDATE");
  const guard = source.indexOf("assertOwnerMutationAllowed");
  const mutation = source.indexOf(write);
  expect(lock).toBeGreaterThan(0);
  expect(guard).toBeGreaterThan(lock);
  expect(mutation).toBeGreaterThan(guard);
}

describe("verrou administratif des launchers suspendus", () => {
  it("revalide la suspension sous verrou avant une mise à jour propriétaire", () => {
    const put = launcherRoute.slice(
      launcherRoute.indexOf("export async function PUT"),
      launcherRoute.indexOf("export async function DELETE"),
    );
    expect(put).toContain("prisma.$transaction");
    expectGuardBefore(put, "tx.launcher.update");
  });

  it("revalide la suspension sous verrou avant suppression", () => {
    const deletion = launcherRoute.slice(
      launcherRoute.indexOf("export async function DELETE"),
    );
    expect(deletion).toContain("prisma.$transaction");
    expectGuardBefore(deletion, "tx.launcher.delete");
    expect(deletion.indexOf("assertNoActivePlayerBans")).toBeLessThan(
      deletion.indexOf("tx.launcher.delete"),
    );
  });

  it("empêche de libérer le slug quand un blocage joueur est actif", () => {
    const put = launcherRoute.slice(
      launcherRoute.indexOf("export async function PUT"),
      launcherRoute.indexOf("export async function DELETE"),
    );
    expect(put).toContain("data.slug && data.slug !== current.slug");
    expect(put.indexOf("assertNoActivePlayerBans")).toBeLessThan(
      put.indexOf("tx.launcher.update"),
    );
    expect(launcherRoute).toContain("LAUNCHER_HAS_ACTIVE_PLAYER_BANS");
  });

  it("interdit aussi la duplication d'une source suspendue", () => {
    expect(duplicateRoute).toContain("prisma.$transaction");
    const lock = duplicateRoute.indexOf("FOR UPDATE");
    const guard = duplicateRoute.indexOf(
      "isLauncherSuspended(source.suspendedAt)",
    );
    const create = duplicateRoute.indexOf("tx.launcher.create");
    expect(lock).toBeGreaterThan(0);
    expect(guard).toBeGreaterThan(lock);
    expect(create).toBeGreaterThan(guard);
  });

  it("interdit de contourner les blocages ciblés par duplication", () => {
    const lock = duplicateRoute.indexOf("FOR UPDATE");
    const banGuard = duplicateRoute.indexOf("tx.playerBan.findFirst");
    const create = duplicateRoute.indexOf("tx.launcher.create");
    expect(banGuard).toBeGreaterThan(lock);
    expect(banGuard).toBeLessThan(create);
    expect(duplicateRoute).toContain("LAUNCHER_HAS_ACTIVE_PLAYER_BANS");
  });

  it("renvoie le code stable LAUNCHER_SUSPENDED", () => {
    expect(launcherRoute).toContain("SUSPENDED_LAUNCHER_OWNER_ERROR.code");
    expect(duplicateRoute).toContain("SUSPENDED_LAUNCHER_OWNER_ERROR.code");
  });

  it("sérialise la création d'un blocage ciblé avec les mutations propriétaire", () => {
    const launcherLock = playerBanRoute.indexOf('SELECT "id" FROM "Launcher"');
    const forUpdate = playerBanRoute.indexOf("FOR UPDATE", launcherLock);
    const create = playerBanRoute.indexOf("tx.playerBan.create");
    expect(launcherLock).toBeGreaterThan(0);
    expect(forUpdate).toBeGreaterThan(launcherLock);
    expect(forUpdate).toBeLessThan(create);
  });
});
