import { describe, expect, it } from "vitest";
import {
  classifyMicrosoftAuthError,
  assertSafeMicrosoftAuthorizationUrl,
  isMinecraftAuthorizationFresh,
  isRecoverableMicrosoftCacheError,
  offlineUuid,
  resolveAzureClientId,
  setOfflineAccount,
} from "./auth";
import { SecureTokenCacheError } from "./secure-token-cache";

describe("authentification hors ligne", () => {
  it("génère un UUID v3 déterministe", () => {
    expect(offlineUuid("Steve")).toBe(offlineUuid("Steve"));
    expect(offlineUuid("Steve")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-3[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("valide strictement le pseudo Minecraft", () => {
    expect(setOfflineAccount("Player_01").ok).toBe(true);
    expect(setOfflineAccount("../evil").ok).toBe(false);
    expect(setOfflineAccount("ab").ok).toBe(false);
  });

  it("préfère le client ID Azure fourni au runtime", () => {
    const runtime = "11111111-1111-4111-8111-111111111111";
    const bundled = "22222222-2222-4222-8222-222222222222";
    expect(resolveAzureClientId(runtime, bundled)).toBe(runtime);
  });

  it("utilise le client ID embarqué dans un build packagé", () => {
    const bundled = "22222222-2222-4222-8222-222222222222";
    expect(resolveAzureClientId(undefined, bundled)).toBe(bundled);
    expect(resolveAzureClientId(undefined, undefined)).toBeNull();
  });

  it("refuse un client ID Azure mal formé", () => {
    expect(() => resolveAzureClientId("pas-un-guid", undefined)).toThrow(
      /format GUID/,
    );
  });

  it.each([
    ["error.gui.closed", /annulée/],
    ["JACH_AZURE_CLIENT_ID invalide : format GUID", /absent ou mal formé/],
    ["AADSTS50011 redirect_uri mismatch", /URI de redirection/],
    ["AADSTS700016", /comptes Microsoft personnels/],
    ["error.auth.xsts.userNotFound", /profil Xbox/],
    ["XErr 2148916238", /famille Microsoft/],
    ["error.auth.xsts.bannedCountry", /pays/],
    ["error.auth.minecraft.profile NOT_FOUND", /licence Minecraft/],
  ])("explique l'erreur Microsoft %s", (detail, expected) => {
    expect(classifyMicrosoftAuthError(detail)).toMatch(expected);
  });

  it("n'autorise que l'endpoint consumers HTTPS de Microsoft", () => {
    expect(
      assertSafeMicrosoftAuthorizationUrl(
        "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?scope=XboxLive.signin",
      ),
    ).toContain("login.microsoftonline.com/consumers/oauth2/v2.0/authorize");
    expect(() =>
      assertSafeMicrosoftAuthorizationUrl(
        "https://attacker.invalid/consumers/oauth2/v2.0/authorize",
      ),
    ).toThrow(/URL_REJECTED/);
  });

  it("rafraîchit un jeton Minecraft cinq minutes avant son expiration", () => {
    const now = 1_000_000;
    const authorization = {
      access_token: "memory-only",
      client_token: "client",
      uuid: "0123456789abcdef0123456789abcdef",
      name: "Steve",
      user_properties: "{}",
      meta: { type: "msa", exp: now + 10 * 60 * 1_000 },
    };
    expect(isMinecraftAuthorizationFresh(authorization, now)).toBe(true);
    expect(
      isMinecraftAuthorizationFresh(
        { ...authorization, meta: { ...authorization.meta, exp: now + 60_000 } },
        now,
      ),
    ).toBe(false);
  });

  it("réinitialise uniquement un cache corrompu, jamais un coffre indisponible", () => {
    expect(
      isRecoverableMicrosoftCacheError(
        new SecureTokenCacheError("cache_invalid", "corrompu"),
      ),
    ).toBe(true);
    expect(
      isRecoverableMicrosoftCacheError(
        new SecureTokenCacheError(
          "encryption_unavailable",
          "coffre indisponible",
        ),
      ),
    ).toBe(false);
  });
});
