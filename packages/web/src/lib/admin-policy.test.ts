import { describe, expect, it } from "vitest";
import {
  evaluateUserAdminAction,
  isActiveAdminRecord,
  isSameOriginRequest,
  normalizePlayerIdentity,
} from "./admin-policy";

describe("isActiveAdminRecord", () => {
  it("refuse immédiatement un rôle rétrogradé ou un admin suspendu", () => {
    expect(isActiveAdminRecord("admin", null)).toBe(true);
    expect(isActiveAdminRecord("user", null)).toBe(false);
    expect(isActiveAdminRecord("admin", new Date())).toBe(false);
  });
});

describe("normalizePlayerIdentity", () => {
  it("normalise les UUID Microsoft avec ou sans tirets", () => {
    expect(
      normalizePlayerIdentity(
        "microsoft_uuid",
        "A0B1C2D3-E4F5-4678-9ABC-DEF012345678",
      ),
    ).toBe("a0b1c2d3e4f546789abcdef012345678");
  });

  it("normalise les pseudos hors-ligne sans accepter de caractères ambigus", () => {
    expect(normalizePlayerIdentity("offline_username", " Steve_42 ")).toBe(
      "steve_42",
    );
    expect(() =>
      normalizePlayerIdentity("offline_username", "bad name"),
    ).toThrow();
  });
});

describe("evaluateUserAdminAction", () => {
  const base = {
    actorId: "admin-1",
    targetId: "user-1",
    targetRole: "user" as const,
    targetDisabled: false,
    activeAdminCount: 2,
    adminCount: 2,
  };

  it("interdit toute action sur son propre compte", () => {
    expect(
      evaluateUserAdminAction({
        ...base,
        action: "ban",
        targetId: base.actorId,
      }),
    ).toEqual({ allowed: false, reason: "SELF_ACTION" });
  });

  it("préserve le dernier administrateur actif et le dernier rôle admin", () => {
    expect(
      evaluateUserAdminAction({
        ...base,
        action: "ban",
        targetRole: "admin",
        activeAdminCount: 1,
        adminCount: 1,
      }),
    ).toEqual({ allowed: false, reason: "LAST_ACTIVE_ADMIN" });
    expect(
      evaluateUserAdminAction({
        ...base,
        action: "demote",
        targetRole: "admin",
        activeAdminCount: 1,
        adminCount: 1,
      }),
    ).toEqual({ allowed: false, reason: "LAST_ADMIN" });
  });

  it("autorise une promotion sûre", () => {
    expect(evaluateUserAdminAction({ ...base, action: "promote" })).toEqual({
      allowed: true,
    });
  });
});

describe("isSameOriginRequest", () => {
  it("n'accepte que l'origine exacte configurée", () => {
    expect(
      isSameOriginRequest(
        "https://internal.example/api/admin",
        "https://yourlauncher.example",
        "https://yourlauncher.example/",
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        "https://internal.example/api/admin",
        "https://internal.example",
        "https://yourlauncher.example/",
      ),
    ).toBe(false);
    expect(
      isSameOriginRequest(
        "https://yourlauncher.example/api/admin",
        "https://evil.example",
      ),
    ).toBe(false);
    expect(
      isSameOriginRequest("https://yourlauncher.example/api/admin", null),
    ).toBe(false);
  });
});
