import { promises as fs } from "node:fs";
import type { LauncherManifest } from "@jach/shared";
import type { InstanceStatus } from "../shared-types/ipc";
import { manifestFingerprint, resolveInside } from "./security";
import { minecraftRoot } from "./store";

const INSTANCE_FILE = ".jach-instance.json";

interface InstanceMetadata {
  schemaVersion: 1;
  manifestFingerprint: string;
  manifestUpdatedAt: string;
  versionId: string;
  installedAt: string;
}

function metadataPath(slug: string): string {
  return resolveInside(minecraftRoot(slug), INSTANCE_FILE);
}

export async function getInstanceStatus(
  manifest: LauncherManifest,
): Promise<InstanceStatus> {
  try {
    const raw = await fs.readFile(metadataPath(manifest.id), "utf8");
    const metadata = JSON.parse(raw) as Partial<InstanceMetadata>;
    return metadata.manifestFingerprint === manifestFingerprint(manifest)
      ? "ready"
      : "update";
  } catch {
    return "first-install";
  }
}

export async function markInstanceInstalled(
  manifest: LauncherManifest,
  versionId: string,
): Promise<void> {
  const target = metadataPath(manifest.id);
  const metadata: InstanceMetadata = {
    schemaVersion: 1,
    manifestFingerprint: manifestFingerprint(manifest),
    manifestUpdatedAt: manifest.updatedAt,
    versionId,
    installedAt: new Date().toISOString(),
  };
  await fs.mkdir(minecraftRoot(manifest.id), { recursive: true });
  const temporary = `${target}.part`;
  await fs.writeFile(temporary, JSON.stringify(metadata, null, 2), "utf8");
  await fs.rename(temporary, target);
}

export async function clearInstanceMetadata(slug: string): Promise<void> {
  await fs.rm(metadataPath(slug), { force: true });
}
