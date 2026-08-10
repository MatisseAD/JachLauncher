import { describe, expect, it } from "vitest";
import { authorizationMatchesAccount, xmclUserType } from "./launch-auth";

describe("type d'authentification XMCL", () => {
  it("utilise legacy uniquement pour le mode hors-ligne", () => {
    expect(xmclUserType("offline")).toBe("legacy");
  });

  it.each(["msa", "microsoft", undefined])(
    "laisse @xmcl/core choisir msa pour %s",
    (type) => {
      expect(xmclUserType(type)).toBeUndefined();
    },
  );
});

describe("cohérence compte et autorisation", () => {
  const microsoftAuthorization = {
    access_token: "memory-only",
    client_token: "client",
    uuid: "0123456789abcdef0123456789abcdef",
    name: "Steve",
    user_properties: "{}",
    meta: { type: "msa" },
  };

  it("accepte l'UUID Microsoft avec ou sans tirets", () => {
    expect(
      authorizationMatchesAccount(microsoftAuthorization, {
        type: "microsoft",
        username: "Steve",
        uuid: "01234567-89ab-cdef-0123-456789abcdef",
      }),
    ).toBe(true);
  });

  it("refuse un nom, UUID ou type différent", () => {
    expect(
      authorizationMatchesAccount(microsoftAuthorization, {
        type: "offline",
        username: "Steve",
        uuid: "0123456789abcdef0123456789abcdef",
      }),
    ).toBe(false);
    expect(
      authorizationMatchesAccount(microsoftAuthorization, {
        type: "microsoft",
        username: "Alex",
        uuid: "0123456789abcdef0123456789abcdef",
      }),
    ).toBe(false);
  });
});
