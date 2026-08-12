import { describe, expect, it } from "vitest";
import { safeLoginReturn } from "./safe-login-return";

describe("safeLoginReturn", () => {
  it("allows the exact admin route", () => {
    expect(safeLoginReturn("/admin")).toBe("/admin");
  });

  it("rejects open redirects and every other path", () => {
    expect(safeLoginReturn("https://evil.example")).toBe("/dashboard");
    expect(safeLoginReturn("//evil.example")).toBe("/dashboard");
    expect(safeLoginReturn("/admin?x=1")).toBe("/dashboard");
    expect(safeLoginReturn(null)).toBe("/dashboard");
  });
});
