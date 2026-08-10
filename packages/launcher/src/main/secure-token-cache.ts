import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ICachePlugin } from "@azure/msal-node";

const MAX_SERIALIZED_CACHE_BYTES = 16 * 1_024 * 1_024;

export interface AsyncSecretProtector {
  isAvailable(): Promise<boolean>;
  encrypt(plainText: string): Promise<Buffer>;
  decrypt(encrypted: Buffer): Promise<{
    result: string;
    shouldReEncrypt: boolean;
  }>;
}

export class SecureTokenCacheError extends Error {
  constructor(
    public readonly code:
      | "encryption_unavailable"
      | "cache_too_large"
      | "cache_invalid"
      | "cache_io",
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "SecureTokenCacheError";
  }
}

function validateSerializedCache(serialized: string): void {
  if (Buffer.byteLength(serialized, "utf8") > MAX_SERIALIZED_CACHE_BYTES) {
    throw new SecureTokenCacheError(
      "cache_too_large",
      "Le cache Microsoft dépasse la taille maximale autorisée.",
    );
  }
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Le cache n'est pas un objet JSON.");
    }
  } catch (error) {
    throw new SecureTokenCacheError(
      "cache_invalid",
      "Le cache Microsoft est invalide.",
      { cause: error },
    );
  }
}

/** Stocke le cache MSAL entier sous forme chiffrée, sans repli en clair. */
export class EncryptedTokenCacheStore {
  constructor(
    public readonly filePath: string,
    private readonly protector: AsyncSecretProtector,
  ) {}

  private async requireEncryption(): Promise<void> {
    if (!(await this.protector.isAvailable())) {
      throw new SecureTokenCacheError(
        "encryption_unavailable",
        "Le chiffrement sécurisé du système n'est pas disponible.",
      );
    }
  }

  private async persistEncrypted(serialized: string): Promise<void> {
    const encrypted = await this.protector.encrypt(serialized);
    if (!encrypted.length) {
      throw new SecureTokenCacheError(
        "cache_io",
        "Le chiffrement du cache Microsoft a produit une valeur vide.",
      );
    }
    await mkdir(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    try {
      await writeFile(temporaryPath, encrypted, { mode: 0o600 });
      await rename(temporaryPath, this.filePath);
    } catch (error) {
      await rm(temporaryPath, { force: true }).catch(() => undefined);
      throw new SecureTokenCacheError(
        "cache_io",
        "Impossible d'enregistrer le cache Microsoft chiffré.",
        { cause: error },
      );
    }
  }

  async load(): Promise<string | null> {
    await this.requireEncryption();
    let encrypted: Buffer;
    try {
      encrypted = await readFile(this.filePath);
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return null;
      }
      throw new SecureTokenCacheError(
        "cache_io",
        "Impossible de lire le cache Microsoft chiffré.",
        { cause: error },
      );
    }
    if (!encrypted.length || encrypted.length > MAX_SERIALIZED_CACHE_BYTES * 2) {
      throw new SecureTokenCacheError(
        "cache_invalid",
        "Le cache Microsoft chiffré est vide ou trop volumineux.",
      );
    }

    let decrypted: { result: string; shouldReEncrypt: boolean };
    try {
      decrypted = await this.protector.decrypt(encrypted);
    } catch (error) {
      throw new SecureTokenCacheError(
        "cache_invalid",
        "Le cache Microsoft chiffré ne peut pas être déverrouillé.",
        { cause: error },
      );
    }
    validateSerializedCache(decrypted.result);
    if (decrypted.shouldReEncrypt) {
      await this.persistEncrypted(decrypted.result);
    }
    return decrypted.result;
  }

  async save(serialized: string): Promise<void> {
    validateSerializedCache(serialized);
    await this.requireEncryption();
    await this.persistEncrypted(serialized);
  }

  async clear(): Promise<void> {
    try {
      await rm(this.filePath, { force: true });
      await rm(`${this.filePath}.tmp`, { force: true });
    } catch (error) {
      throw new SecureTokenCacheError(
        "cache_io",
        "Impossible de supprimer le cache Microsoft.",
        { cause: error },
      );
    }
  }
}

/** Branche le stockage chiffré sur les hooks de persistance officiels MSAL. */
export function createEncryptedMsalCachePlugin(
  store: EncryptedTokenCacheStore,
): ICachePlugin {
  let hydrated = false;
  return {
    async beforeCacheAccess(context) {
      if (hydrated) return;
      const serialized = await store.load();
      if (serialized) context.tokenCache.deserialize(serialized);
      hydrated = true;
    },
    async afterCacheAccess(context) {
      if (context.cacheHasChanged) {
        await store.save(context.tokenCache.serialize());
      }
    },
  };
}
