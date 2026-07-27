import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Stockage des assets uploadés (logos, fonds).
// - En production (Vercel) : Vercel Blob si BLOB_READ_WRITE_TOKEN est défini.
// - En local / sans token : disque local, servi par /api/storage/[...path].
const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

const USE_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

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
