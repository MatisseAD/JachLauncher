import { describe, expect, it } from "vitest";
import { shouldShowDesktopUpdate } from "../shared-types/ipc";

describe("visibilité de la mise à jour desktop", () => {
  it("cache les contrôles silencieux et leurs erreurs", () => {
    expect(shouldShowDesktopUpdate({ status: "idle" })).toBe(false);
    expect(shouldShowDesktopUpdate({ status: "checking" })).toBe(false);
    expect(
      shouldShowDesktopUpdate({
        status: "error",
        message: "Canal momentanément indisponible",
      }),
    ).toBe(false);
  });

  it("reste visible lorsqu'une mise à jour connue est interrompue", () => {
    expect(
      shouldShowDesktopUpdate({
        status: "error",
        version: "3.0.3",
        requiresUpdate: true,
      }),
    ).toBe(true);
    expect(
      shouldShowDesktopUpdate({ status: "available", version: "3.0.3" }),
    ).toBe(true);
    expect(
      shouldShowDesktopUpdate({ status: "downloading", version: "3.0.3" }),
    ).toBe(true);
    expect(shouldShowDesktopUpdate({ status: "ready", version: "3.0.3" })).toBe(
      true,
    );
  });
});
