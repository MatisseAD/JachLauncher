import { describe, expect, it } from "vitest";
import { offlineUuid, resolveAzureClientId, setOfflineAccount } from "./auth";

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
});
