import { describe, expect, it } from "vitest";
import {
  adminLoadErrorHtml,
  isAllowedAdminNavigation,
} from "./admin-window-policy";

describe("admin window navigation allowlist", () => {
  it("allows only the production admin and its login round-trip", () => {
    expect(
      isAllowedAdminNavigation("https://yourlauncher.vercel.app/admin"),
    ).toBe(true);
    expect(
      isAllowedAdminNavigation(
        "https://yourlauncher.vercel.app/login?next=%2Fadmin",
      ),
    ).toBe(true);
  });

  it("rejects other origins, paths, credentials and redirects", () => {
    expect(isAllowedAdminNavigation("https://evil.example/admin")).toBe(false);
    expect(
      isAllowedAdminNavigation("https://yourlauncher.vercel.app/dashboard"),
    ).toBe(false);
    expect(
      isAllowedAdminNavigation("https://yourlauncher.vercel.app/admin?next=x"),
    ).toBe(false);
    expect(
      isAllowedAdminNavigation(
        "https://yourlauncher.vercel.app/login?next=https://evil.example",
      ),
    ).toBe(false);
    expect(
      isAllowedAdminNavigation(
        "https://user:pass@yourlauncher.vercel.app/admin",
      ),
    ).toBe(false);
  });
});

describe("admin load error page", () => {
  it("offers a fixed retry without executable script", () => {
    const html = adminLoadErrorHtml();
    expect(html).toContain('href="https://yourlauncher.vercel.app/admin"');
    expect(html).toContain("default-src 'none'");
    expect(html).not.toMatch(/<script|onclick=/i);
  });
});
