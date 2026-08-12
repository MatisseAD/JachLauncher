import { describe, expect, it } from "vitest";
import { sanitizeStoredAccount } from "./account-state";

describe("métadonnées de compte persistées", () => {
  it("conserve un compte Microsoft sans donnée supplémentaire", () => {
    expect(
      sanitizeStoredAccount({
        type: "microsoft",
        username: "Steve",
        uuid: "0123456789abcdef0123456789abcdef",
        avatarUrl: "https://attacker.invalid/track",
        access_token: "must-not-survive",
      }),
    ).toEqual({
      type: "microsoft",
      username: "Steve",
      uuid: "0123456789abcdef0123456789abcdef",
      avatarUrl:
        "https://mc-heads.net/avatar/0123456789abcdef0123456789abcdef/64",
    });
  });

  it("rejette les comptes incomplets ou aux types inconnus", () => {
    expect(
      sanitizeStoredAccount({ type: "microsoft", username: "Steve" }),
    ).toBeNull();
    expect(
      sanitizeStoredAccount({
        type: "admin",
        username: "Steve",
        uuid: "0123456789abcdef0123456789abcdef",
      }),
    ).toBeNull();
  });
});
