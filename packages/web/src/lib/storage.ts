import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

// Stockage local des assets uploadés (logos, fonds). En prod : S3/R2.
const STORAGE_ROOT = path.join(process.cwd(), "storage", "uploads");

export async function saveUpload(
  launcherId: string,
  originalName: string,
  data: Buffer,
): Promise<{ relativePath: string }> {
  const dir = path.join(STORAGE_ROOT, launcherId);
  await fs.mkdir(dir, { recursive: true });

  const ext = path.extname(originalName).toLowerCase() || ".bin";
  const safeBase = crypto.randomBytes(8).toString("hex");
  const fileName = `${safeBase}${ext}`;
  await fs.writeFile(path.join(dir, fileName), data);

  // Chemin relatif servi par /api/storage/[...path]
  return { relativePath: `${launcherId}/${fileName}` };
}

export async function readUpload(relativePath: string): Promise<Buffer | null> {
  // Empêche le path traversal.
  const safe = path
    .normalize(relativePath)
    .replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(STORAGE_ROOT, safe);
  if (!full.startsWith(STORAGE_ROOT)) return null;
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
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}
