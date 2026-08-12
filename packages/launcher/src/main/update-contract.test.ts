import { describe, expect, it } from "vitest";
import {
  describeUpdaterError,
  validDesktopVersion,
  validateUpdateFeedUrl,
  WINDOWS_UPDATE_FEED_URL,
} from "./update-contract";

const TEST_UPDATE_FEED_URL =
  "https://signed-updates.public.blob.vercel-storage.com/releases/windows";

describe("contrat de mise à jour desktop", () => {
  it("n'accepte qu'un canal HTTPS sans identifiants ni paramètres", () => {
    expect(validateUpdateFeedUrl(`${TEST_UPDATE_FEED_URL}/`)).toBe(
      TEST_UPDATE_FEED_URL,
    );
    expect(() => validateUpdateFeedUrl("")).toThrow(/pas configuré/);
    expect(() => validateUpdateFeedUrl("http://updates.example.com")).toThrow();
    expect(() =>
      validateUpdateFeedUrl("https://user:pass@updates.example.com"),
    ).toThrow();
    expect(() =>
      validateUpdateFeedUrl("https://updates.example.com?channel=evil"),
    ).toThrow();
  });

  it("ne contient jamais implicitement le canal historique", () => {
    expect(WINDOWS_UPDATE_FEED_URL).not.toContain(
      "5v6eph0amoamojpm.public.blob.vercel-storage.com",
    );
  });

  it("valide les versions SemVer du manifeste", () => {
    expect(validDesktopVersion("1.2.3")).toBe("1.2.3");
    expect(validDesktopVersion("2.0.0-beta.1+build.4")).toBe(
      "2.0.0-beta.1+build.4",
    );
    expect(validDesktopVersion("v1.2.3")).toBeNull();
    expect(validDesktopVersion("1.2")).toBeNull();
    expect(validDesktopVersion("01.2.3")).toBeNull();
  });

  it("rend les erreurs de canal et d'intégrité actionnables", () => {
    expect(describeUpdaterError(new Error("HTTP 404 latest.yml"))).toMatch(
      /incomplet/,
    );
    expect(describeUpdaterError(new Error("sha512 mismatch"))).toMatch(
      /intégrité/,
    );
    expect(
      describeUpdaterError(new Error("net::ERR_INTERNET_DISCONNECTED")),
    ).toMatch(/connexion/);
  });
});
