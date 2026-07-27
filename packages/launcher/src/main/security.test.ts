import path from "node:path";
import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { canonicalManifestPayload, type LauncherManifest } from "@jach/shared";
import {
  isPrivateAddress,
  manifestFingerprint,
  normalizeBaseUrl,
  resolveInside,
  safeExternalUrl,
  verifyManifestSignature,
} from "./security";

describe("sécurité du launcher", () => {
  it("confine tous les chemins dans l'instance", () => {
    const root = path.resolve("instance-test");
    expect(resolveInside(root, "mods", "safe.jar")).toBe(
      path.join(root, "mods", "safe.jar"),
    );
    expect(() => resolveInside(root, "..", "escape.jar")).toThrow();
  });

  it("n'accepte que HTTPS ou un serveur local de développement", () => {
    expect(normalizeBaseUrl("https://example.com/")).toBe(
      "https://example.com",
    );
    expect(normalizeBaseUrl("http://localhost:3000/")).toBe(
      "http://localhost:3000",
    );
    expect(() => normalizeBaseUrl("http://example.com")).toThrow();
    expect(() => safeExternalUrl("file:///etc/passwd")).toThrow();
  });

  it.each([
    "127.0.0.1",
    "10.0.0.4",
    "172.16.1.2",
    "192.168.1.2",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
  ])("identifie %s comme adresse privée", (address) => {
    expect(isPrivateAddress(address)).toBe(true);
  });

  it("produit une empreinte stable indépendamment de l'ordre des clés", () => {
    const first = { b: 2, a: 1 } as unknown as LauncherManifest;
    const second = { a: 1, b: 2 } as unknown as LauncherManifest;
    expect(manifestFingerprint(first)).toBe(manifestFingerprint(second));
  });

  it("vérifie une signature Ed25519 et détecte une altération", () => {
    const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
    const manifest = {
      id: "serveur-test",
      updatedAt: "2026-07-27T12:00:00.000Z",
    } as unknown as LauncherManifest;
    const signature = crypto
      .sign(null, Buffer.from(canonicalManifestPayload(manifest)), privateKey)
      .toString("base64");
    manifest.signature = {
      algorithm: "ed25519",
      publicKey: publicKey
        .export({ format: "der", type: "spki" })
        .toString("base64"),
      value: signature,
    };
    expect(verifyManifestSignature(manifest).valid).toBe(true);
    manifest.updatedAt = "2026-07-28T12:00:00.000Z";
    expect(verifyManifestSignature(manifest).valid).toBe(false);
  });
});
