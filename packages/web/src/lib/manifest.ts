import crypto from "node:crypto";
import {
  canonicalManifestPayload,
  LauncherManifestSchema,
  MANIFEST_SCHEMA_VERSION,
  type LauncherManifest,
  type DownloadableFile,
  type NewsEntry,
} from "@jach/shared";
import type { Launcher } from "@prisma/client";

let signingKeyCache:
  | {
      encodedPrivateKey: string;
      privateKey: crypto.KeyObject;
      publicKey: string;
    }
  | undefined;

/** Transforme une URL stockée (relative ou absolue) en URL absolue servie. */
function resolveAssetUrl(
  stored: string | null,
  baseUrl: string,
): string | undefined {
  if (!stored) return undefined;
  if (/^https?:\/\//i.test(stored)) return stored;
  return `${baseUrl}/api/storage/${stored}`;
}

function parseFileArray(json: string): DownloadableFile[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function parseNewsArray(json: string): NewsEntry[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function parseStringArray(json: string): string[] {
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function parseAny(json: string, fallback: unknown): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/**
 * Construit le manifeste public (validé) à partir d'une ligne Launcher.
 * baseUrl = origine de la requête, ex "http://localhost:3000".
 */
export function buildManifest(
  launcher: Launcher,
  baseUrl: string,
): LauncherManifest {
  const manifest = {
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    id: launcher.slug,
    updatedAt: launcher.updatedAt.toISOString(),
    launcherType: launcher.launcherType as LauncherManifest["launcherType"],
    preLaunchMessage: launcher.preLaunchMessage,
    branding: {
      title: launcher.title,
      description: launcher.description,
      logoUrl: resolveAssetUrl(launcher.logoUrl, baseUrl),
      backgroundUrl: resolveAssetUrl(launcher.backgroundUrl, baseUrl),
      primaryColor: launcher.primaryColor,
      secondaryColor: launcher.secondaryColor,
      textColor: launcher.textColor,
      theme: launcher.theme as "dark" | "light",
      visualStyle:
        launcher.visualStyle as LauncherManifest["branding"]["visualStyle"],
      buttonStyle:
        launcher.buttonStyle as LauncherManifest["branding"]["buttonStyle"],
      cardShape:
        launcher.cardShape as LauncherManifest["branding"]["cardShape"],
      menuPlacement:
        launcher.menuPlacement as LauncherManifest["branding"]["menuPlacement"],
      showNews: launcher.showNews,
      showDiscord: launcher.showDiscord,
      showWebsite: launcher.showWebsite,
      discordUrl: launcher.discordUrl ?? undefined,
      websiteUrl: launcher.websiteUrl ?? undefined,
      supportUrl: launcher.supportUrl ?? undefined,
      ambiance: launcher.ambiance as LauncherManifest["branding"]["ambiance"],
    },
    minecraft: {
      version: launcher.mcVersion,
      loader: launcher.loader as LauncherManifest["minecraft"]["loader"],
      loaderVersion: launcher.loaderVersion ?? undefined,
      javaMajor: launcher.javaMajor ?? undefined,
    },
    server: {
      address: launcher.serverAddress ?? undefined,
      port: launcher.serverPort ?? undefined,
    },
    memory: { min: launcher.memMin, max: launcher.memMax },
    mods: parseFileArray(launcher.mods),
    resourcepacks: parseFileArray(launcher.resourcepacks),
    shaderpacks: parseFileArray(launcher.shaderpacks),
    news: parseNewsArray(launcher.news),
    events: parseAny(launcher.events, []),
    patchNotes: parseAny(launcher.patchNotes, []),
    maintenance: parseAny(launcher.maintenance, { active: false }),
    alert: parseAny(launcher.alert, {
      active: false,
      kind: "info",
      message: "",
    }),
    jvmArgs: parseStringArray(launcher.jvmArgs),
  };

  // Valide/normalise (applique les valeurs par défaut Zod) avant publication.
  return signManifest(LauncherManifestSchema.parse(manifest));
}

export function signManifest(manifest: LauncherManifest): LauncherManifest {
  const encodedPrivateKey = process.env.MANIFEST_SIGNING_PRIVATE_KEY;
  if (!encodedPrivateKey) return manifest;

  if (signingKeyCache?.encodedPrivateKey !== encodedPrivateKey) {
    const privateKey = crypto.createPrivateKey({
      key: Buffer.from(encodedPrivateKey, "base64"),
      format: "der",
      type: "pkcs8",
    });
    if (privateKey.asymmetricKeyType !== "ed25519") {
      throw new Error("MANIFEST_SIGNING_PRIVATE_KEY n'est pas une clé Ed25519");
    }
    const publicKey = crypto
      .createPublicKey(privateKey)
      .export({ format: "der", type: "spki" })
      .toString("base64");
    signingKeyCache = { encodedPrivateKey, privateKey, publicKey };
  }

  const value = crypto
    .sign(
      null,
      Buffer.from(canonicalManifestPayload(manifest), "utf8"),
      signingKeyCache.privateKey,
    )
    .toString("base64");
  return LauncherManifestSchema.parse({
    ...manifest,
    signature: {
      algorithm: "ed25519",
      publicKey: signingKeyCache.publicKey,
      value,
    },
  });
}
