import { describe, expect, it } from "vitest";
import { offlineUuid, setOfflineAccount } from "./auth";

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
});
