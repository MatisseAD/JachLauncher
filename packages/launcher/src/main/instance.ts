import { promises as fs } from "node:fs";
import type { LauncherManifest } from "@jach/shared";
import type { InstanceStatus } from "../shared-types/ipc";
import {
  manifestFingerprint,
  normalizeBaseUrl,
  resolveInside,
} from "./security";
import { ensureMinecraftRoot } from "./store";

const INSTANCE_FILE = ".jach-instance.json";

interface InstanceMetadata {
  schemaVersion: 2;
  baseUrl: string;
  manifestFingerprint: string;
  manifestUpdatedAt: string;
  versionId: string;
  installedAt: string;
}

type StoredInstanceMetadata = Partial<
  Omit<InstanceMetadata, "schemaVersion">
> & {
  schemaVersion?: number;
};

function metadataPath(root: string): string {
  return resolveInside(root, INSTANCE_FILE);
}

export async function getInstanceStatus(
  manifest: LauncherManifest,
  baseUrl: string,
): Promise<InstanceStatus> {
  try {
    const root = await ensureMinecraftRoot(baseUrl, manifest.id);
    const raw = await fs.readFile(metadataPath(root), "utf8");
    const metadata = JSON.parse(raw) as StoredInstanceMetadata;
    const correctOrigin =
      metadata.schemaVersion === 1 ||
      (metadata.schemaVersion === 2 &&
        metadata.baseUrl === normalizeBaseUrl(baseUrl));
    return correctOrigin &&
      metadata.manifestFingerprint === manifestFingerprint(manifest)
      ? "ready"
      : "update";
  } catch {
    return "first-install";
  }
}

export async function markInstanceInstalled(
  manifest: LauncherManifest,
  versionId: string,
  baseUrl: string,
): Promise<void> {
  const root = await ensureMinecraftRoot(baseUrl, manifest.id);
  const target = metadataPath(root);
  const metadata: InstanceMetadata = {
    schemaVersion: 2,
    baseUrl: normalizeBaseUrl(baseUrl),
    manifestFingerprint: manifestFingerprint(manifest),
    manifestUpdatedAt: manifest.updatedAt,
    versionId,
    installedAt: new Date().toISOString(),
  };
  await fs.mkdir(root, { recursive: true });
  const temporary = `${target}.part`;
  await fs.writeFile(temporary, JSON.stringify(metadata, null, 2), "utf8");
  await fs.rename(temporary, target);
}

export async function clearInstanceMetadata(
  baseUrl: string,
  slug: string,
): Promise<void> {
  const root = await ensureMinecraftRoot(baseUrl, slug);
  await fs.rm(metadataPath(root), { force: true });
}
