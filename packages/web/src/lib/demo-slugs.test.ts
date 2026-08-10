import { describe, expect, it } from "vitest";
import { DEMO_SLUG, DEMO_SLUGS, isDemoSlug } from "./demo-slugs";
import { DEMO_LAUNCHERS } from "./demo-launchers";

describe("slugs des démonstrations intégrées", () => {
  it("utilise une source unique pour les données de démonstration", () => {
    expect(DEMO_LAUNCHERS.map((launcher) => launcher.slug)).toEqual(DEMO_SLUGS);
  });

  it("reconnaît uniquement les slugs réservés", () => {
    expect(isDemoSlug(DEMO_SLUG.yourLauncher)).toBe(true);
    expect(isDemoSlug("mon-serveur")).toBe(false);
  });
});
