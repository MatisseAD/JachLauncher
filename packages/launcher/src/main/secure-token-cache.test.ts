import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  EncryptedTokenCacheStore,
  type AsyncSecretProtector,
} from "./secure-token-cache";

const temporaryDirectories: string[] = [];

async function temporaryCachePath(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "jach-msal-test-"));
  temporaryDirectories.push(directory);
  return path.join(directory, "microsoft-auth-cache.bin");
}

function testProtector(options?: {
  available?: boolean;
  shouldReEncrypt?: boolean;
}): AsyncSecretProtector {
  return {
    async isAvailable() {
      return options?.available ?? true;
    },
    async encrypt(plainText) {
      return Buffer.from(
        `encrypted:${Buffer.from(plainText).toString("base64")}`,
      );
    },
    async decrypt(encrypted) {
      const payload = encrypted.toString("utf8");
      if (!payload.startsWith("encrypted:")) throw new Error("ciphertext");
      return {
        result: Buffer.from(
          payload.slice("encrypted:".length),
          "base64",
        ).toString("utf8"),
        shouldReEncrypt: options?.shouldReEncrypt ?? false,
      };
    },
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe("cache MSAL chiffré", () => {
  it("ne persiste jamais le cache ni les jetons en clair", async () => {
    const filePath = await temporaryCachePath();
    const store = new EncryptedTokenCacheStore(filePath, testProtector());
    const serialized = JSON.stringify({ refreshToken: "highly-secret-token" });

    await store.save(serialized);
    const bytes = await readFile(filePath);
    expect(bytes.toString("utf8")).not.toContain("highly-secret-token");
    await expect(store.load()).resolves.toBe(serialized);
  });

  it("écrase atomiquement une version existante et supprime le cache", async () => {
    const filePath = await temporaryCachePath();
    const store = new EncryptedTokenCacheStore(filePath, testProtector());

    await store.save(JSON.stringify({ value: 1 }));
    await store.save(JSON.stringify({ value: 2 }));
    await expect(store.load()).resolves.toBe(JSON.stringify({ value: 2 }));
    await store.clear();
    await expect(store.load()).resolves.toBeNull();
  });

  it("échoue fermé quand safeStorage asynchrone est indisponible", async () => {
    const store = new EncryptedTokenCacheStore(
      await temporaryCachePath(),
      testProtector({ available: false }),
    );
    await expect(
      store.save(JSON.stringify({ value: 1 })),
    ).rejects.toMatchObject({ code: "encryption_unavailable" });
    await expect(store.load()).rejects.toMatchObject({
      code: "encryption_unavailable",
    });
  });

  it("rejette un cache déchiffré non JSON", async () => {
    const filePath = await temporaryCachePath();
    const protector = testProtector();
    const store = new EncryptedTokenCacheStore(filePath, protector);
    await store.save(JSON.stringify({ valid: true }));

    const corruptProtector: AsyncSecretProtector = {
      ...protector,
      async decrypt() {
        return { result: "token-instead-of-json", shouldReEncrypt: false };
      },
    };
    const corruptStore = new EncryptedTokenCacheStore(
      filePath,
      corruptProtector,
    );
    await expect(corruptStore.load()).rejects.toMatchObject({
      code: "cache_invalid",
    });
  });
});
