import { describe, expect, it } from "vitest";
import { ADMIN_CENTER_URL, assertFixedAdminCenterUrl } from "./external-links";

describe("lien du centre d'administration", () => {
  it("reste une URL HTTPS canonique sans entrée du renderer", () => {
    expect(assertFixedAdminCenterUrl(ADMIN_CENTER_URL)).toBe(
      "https://yourlauncher.vercel.app/admin",
    );
    expect(() =>
      assertFixedAdminCenterUrl("https://attacker.invalid/admin"),
    ).toThrow(/ADMIN_CENTER_URL_INVALID/);
  });
});
