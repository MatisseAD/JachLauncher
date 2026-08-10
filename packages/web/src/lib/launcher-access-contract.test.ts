import { describe, expect, it } from "vitest";
import {
  launcherAccessIdentity,
  LauncherAccessAccountSchema,
} from "./launcher-access-contract";

describe("contrat de contrôle d'accès du launcher", () => {
  it("utilise uniquement l'UUID d'un compte Microsoft", () => {
    const account = LauncherAccessAccountSchema.parse({
      type: "microsoft",
      uuid: "A0B1C2D3-E4F5-4678-9ABC-DEF012345678",
      username: "Notch",
    });
    expect(launcherAccessIdentity(account)).toEqual({
      subjectType: "microsoft_uuid",
      subjectValue: "a0b1c2d3e4f546789abcdef012345678",
    });
  });

  it("ignore l'UUID local et utilise uniquement le pseudo hors-ligne", () => {
    const account = LauncherAccessAccountSchema.parse({
      type: "offline",
      uuid: "local-value-not-used-for-authorization",
      username: "Steve_42",
    });
    expect(launcherAccessIdentity(account)).toEqual({
      subjectType: "offline_username",
      subjectValue: "steve_42",
    });
  });

  it("refuse les champs supplémentaires et les UUID Microsoft invalides", () => {
    expect(
      LauncherAccessAccountSchema.safeParse({
        type: "microsoft",
        uuid: "invalid",
        username: "Notch",
      }).success,
    ).toBe(false);
    expect(
      LauncherAccessAccountSchema.safeParse({
        type: "offline",
        uuid: "offline-uuid",
        username: "Steve",
        avatarUrl: "https://example.test/avatar.png",
      }).success,
    ).toBe(false);
  });
});
