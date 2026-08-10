import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Stockage des assets uploadés (logos, fonds).
// - En production (Vercel) : Vercel Blob si BLOB_READ_WRITE_TOKEN est défini.
// - En local / sans token : disque local, servi par /api/storage/[...path].
const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

const USE_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const NAMESPACE_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;
const GENERATED_FILE_PATTERN = /^[0-9a-f]{16}\.(?:png|jpg|jpeg|gif|webp)$/;
const VERCEL_PUBLIC_BLOB_SUFFIX = ".public.blob.vercel-storage.com";

function isSafeNamespace(namespace: string): boolean {
  return NAMESPACE_PATTERN.test(namespace);
}

function localUploadKey(value: string): string | null {
  if (/^https?:\/\//i.test(value)) return null;
  const normalized = value.replace(/\\/g, "/");
  const parts = normalized.split("/");
  if (
    parts.length !== 2 ||
    !isSafeNamespace(parts[0]) ||
    !GENERATED_FILE_PATTERN.test(parts[1])
  ) {
    return null;
  }
  return normalized;
}

function blobUploadKey(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !url.hostname.endsWith(VERCEL_PUBLIC_BLOB_SUFFIX) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      return null;
    }
    return localUploadKey(url.pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

/** Vérifie qu'une valeur désigne un objet généré dans l'espace attendu. */
export function isManagedUpload(
  value: string | null,
  namespace: string,
): boolean {
  if (!value || !isSafeNamespace(namespace)) return false;
  const key = localUploadKey(value) ?? blobUploadKey(value);
  return key?.startsWith(`${namespace}/`) ?? false;
}

/**
 * Enregistre un upload et renvoie la valeur à stocker dans logoUrl/backgroundUrl.
 * - Blob : URL absolue publique (gérée telle quelle par le launcher et le site).
 * - Local : chemin relatif (résolu via /api/storage/...).
 */
export async function saveUpload(
  launcherId: string,
  extension: string,
  data: Buffer,
): Promise<{ relativePath: string }> {
  if (!isSafeNamespace(launcherId)) {
    throw new Error("Espace de stockage invalide");
  }
  const key = `${launcherId}/${crypto.randomBytes(8).toString("hex")}${extension}`;

  if (USE_BLOB) {
    const { put } = await import("@vercel/blob");
    const blob = await put(key, data, {
      access: "public",
      contentType: contentTypeFor(key),
      addRandomSuffix: false,
    });
    return { relativePath: blob.url }; // URL absolue
  }

  const dir = path.join(STORAGE_ROOT, launcherId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(STORAGE_ROOT, key), data);
  return { relativePath: key };
}

/**
 * Supprime uniquement un objet dont le nom aléatoire et l'espace correspondent
 * à ceux générés par l'application. Les URL externes sont toujours ignorées.
 */
export async function deleteUpload(
  value: string | null,
  namespace: string,
): Promise<boolean> {
  if (!value || !isManagedUpload(value, namespace)) return false;

  if (/^https:\/\//i.test(value)) {
    if (!USE_BLOB) return false;
    const { del } = await import("@vercel/blob");
    await del(value);
    return true;
  }

  const key = localUploadKey(value);
  if (!key) return false;
  const root = path.resolve(STORAGE_ROOT);
  const full = path.resolve(root, key);
  if (!full.startsWith(`${root}${path.sep}`)) return false;
  await fs.unlink(full).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  });
  return true;
}

/** Supprime l'espace complet d'un launcher, y compris ses anciens orphelins. */
export async function deleteUploadNamespace(namespace: string): Promise<void> {
  if (!isSafeNamespace(namespace)) {
    throw new Error("Espace de stockage invalide");
  }

  if (USE_BLOB) {
    const { del, list } = await import("@vercel/blob");
    let cursor: string | undefined;
    do {
      const page = await list({ prefix: `${namespace}/`, cursor, limit: 1000 });
      if (page.blobs.length > 0) {
        await del(page.blobs.map((blob) => blob.url));
      }
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return;
  }

  const root = path.resolve(STORAGE_ROOT);
  const directory = path.resolve(root, namespace);
  if (!directory.startsWith(`${root}${path.sep}`)) {
    throw new Error("Espace de stockage hors racine");
  }
  await fs.rm(directory, { recursive: true, force: true });
}

export async function readUpload(relativePath: string): Promise<Buffer | null> {
  const root = path.resolve(STORAGE_ROOT);
  const full = path.resolve(root, relativePath);
  if (!full.startsWith(`${root}${path.sep}`)) return null;
  try {
    return await fs.readFile(full);
  } catch {
    return null;
  }
}

export function contentTypeFor(relativePath: string): string {
  const ext = path.extname(relativePath).toLowerCase();
  switch (ext) {
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
