import { describe, expect, it } from "vitest";
import { isManagedUpload } from "./storage";

describe("reconnaissance des uploads gérés", () => {
  const namespace = "launcher_123";
  const file = "0123456789abcdef.webp";

  it("accepte les clés locales et URL Vercel Blob générées", () => {
    expect(isManagedUpload(`${namespace}/${file}`, namespace)).toBe(true);
    expect(
      isManagedUpload(
        `https://store.public.blob.vercel-storage.com/${namespace}/${file}`,
        namespace,
      ),
    ).toBe(true);
  });

  it("refuse les URL externes, les autres espaces et les traversées", () => {
    expect(
      isManagedUpload(
        `https://cdn.example.com/${namespace}/${file}`,
        namespace,
      ),
    ).toBe(false);
    expect(isManagedUpload(`other/${file}`, namespace)).toBe(false);
    expect(isManagedUpload(`../${namespace}/${file}`, namespace)).toBe(false);
    expect(
      isManagedUpload(
        `https://store.public.blob.vercel-storage.com/${namespace}/${file}?x=1`,
        namespace,
      ),
    ).toBe(false);
  });
});
