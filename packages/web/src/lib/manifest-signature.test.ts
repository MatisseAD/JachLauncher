import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import {
  canonicalManifestPayload,
  LauncherManifestSchema,
  MANIFEST_SCHEMA_VERSION,
} from "@jach/shared";
import { signManifest } from "./manifest";

const previousKey = process.env.MANIFEST_SIGNING_PRIVATE_KEY;

afterEach(() => {
  if (previousKey === undefined) {
    delete process.env.MANIFEST_SIGNING_PRIVATE_KEY;
  } else {
    process.env.MANIFEST_SIGNING_PRIVATE_KEY = previousKey;
  }
});

describe("signature du manifeste web", () => {
  it("signe le JSON normalisé avec une clé Ed25519", () => {
    const { privateKey } = crypto.generateKeyPairSync("ed25519");
    process.env.MANIFEST_SIGNING_PRIVATE_KEY = privateKey
      .export({ format: "der", type: "pkcs8" })
      .toString("base64");
    const unsigned = LauncherManifestSchema.parse({
      schemaVersion: MANIFEST_SCHEMA_VERSION,
      id: "serveur-test",
      updatedAt: "2026-07-27T12:00:00.000Z",
      branding: { title: "Serveur test" },
      minecraft: { version: "1.21.1" },
    });
    const signed = signManifest(unsigned);
    expect(signed.signature?.algorithm).toBe("ed25519");

    const publicKey = crypto.createPublicKey({
      key: Buffer.from(signed.signature!.publicKey, "base64"),
      format: "der",
      type: "spki",
    });
    expect(
      crypto.verify(
        null,
        Buffer.from(canonicalManifestPayload(signed)),
        publicKey,
        Buffer.from(signed.signature!.value, "base64"),
      ),
    ).toBe(true);
  });
});
