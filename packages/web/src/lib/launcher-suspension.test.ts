import { describe, expect, it } from "vitest";
import { isLauncherSuspended } from "./launcher-suspension";

describe("isLauncherSuspended", () => {
  it("considère tout horodatage de suspension comme un verrou administratif", () => {
    expect(isLauncherSuspended(new Date())).toBe(true);
    expect(isLauncherSuspended("2026-08-10T12:00:00.000Z")).toBe(true);
  });

  it("laisse les launchers restaurés modifiables", () => {
    expect(isLauncherSuspended(null)).toBe(false);
    expect(isLauncherSuspended(undefined)).toBe(false);
  });
});
