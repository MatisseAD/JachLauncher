import { describe, expect, it } from "vitest";
import { assetUrl } from "./asset";

describe("assetUrl", () => {
  it("conserve les URL publiques et absolues", () => {
    expect(assetUrl("/examples/nova-survival.svg")).toBe(
      "/examples/nova-survival.svg",
    );
    expect(assetUrl("https://cdn.example.com/background.webp")).toBe(
      "https://cdn.example.com/background.webp",
    );
  });

  it("résout les clés du stockage applicatif", () => {
    expect(assetUrl("launcher-1/background.webp")).toBe(
      "/api/storage/launcher-1/background.webp",
    );
    expect(assetUrl(null)).toBeUndefined();
  });
});
