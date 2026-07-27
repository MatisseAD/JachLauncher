import { execFile } from "node:child_process";
import path from "node:path";
import { promises as fs } from "node:fs";
import { app } from "electron";
import extractZip from "extract-zip";
import * as tar from "tar";
import type { LauncherManifest } from "@jach/shared";
import type { LaunchProgress } from "../shared-types/ipc";
import { assertSafeRemoteUrl } from "./security";

type Emit = (progress: LaunchProgress) => void;
type Log = (line: string) => void;

/** Repli hors-ligne pour les versions release connues. */
export function requiredJavaMajor(manifest: LauncherManifest): number {
  if (manifest.minecraft.javaMajor) return manifest.minecraft.javaMajor;
  const version = manifest.minecraft.version
    .split(".")
    .map((part) => Number.parseInt(part, 10) || 0);
  const minor = version[1] ?? 0;
  const patch = version[2] ?? 0;
  if (minor <= 16) return 8;
  if (minor === 17) return 16;
  if (minor < 20 || (minor === 20 && patch <= 4)) return 17;
  return 21;
}

/** Lit la métadonnée Mojang exacte, y compris pour les snapshots. */
export async function resolveRequiredJavaMajor(
  manifest: LauncherManifest,
): Promise<number> {
  if (manifest.minecraft.javaMajor) return manifest.minecraft.javaMajor;
  try {
    const listResponse = await fetch(
      "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
      { signal: AbortSignal.timeout(15_000) },
    );
    if (!listResponse.ok) throw new Error(`HTTP ${listResponse.status}`);
    const list = (await listResponse.json()) as {
      versions?: Array<{ id: string; url: string }>;
    };
    const entry = list.versions?.find(
      (version) => version.id === manifest.minecraft.version,
    );
    if (!entry) throw new Error("Version absente");
    await assertSafeRemoteUrl(entry.url);
    const detailResponse = await fetch(entry.url, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!detailResponse.ok) throw new Error(`HTTP ${detailResponse.status}`);
    const details = (await detailResponse.json()) as {
      javaVersion?: { majorVersion?: number };
    };
    const major = details.javaVersion?.majorVersion;
    if (major && Number.isInteger(major)) return major;
  } catch {
    // Une release peut encore démarrer hors ligne grâce au repli ci-dessus.
  }
  return requiredJavaMajor(manifest);
}

export function detectSystemJavaMajor(): Promise<number | null> {
  return new Promise((resolve) => {
    execFile("java", ["-version"], (error, _stdout, stderr) => {
      if (error) return resolve(null);
      const match = stderr.match(/version "(\d+)(?:\.(\d+))?/);
      if (!match) return resolve(null);
      const first = Number.parseInt(match[1], 10);
      const major = first === 1 ? Number.parseInt(match[2] ?? "0", 10) : first;
      resolve(Number.isFinite(major) ? major : null);
    });
  });
}

function runtimeDir(major: number): string {
  return path.join(app.getPath("userData"), "runtime", `jdk-${major}`);
}

async function findJavaBinary(root: string): Promise<string | null> {
  const executable = process.platform === "win32" ? "java.exe" : "java";
  let entries: string[];
  try {
    entries = await fs.readdir(root);
  } catch {
    return null;
  }
  const candidates = entries.flatMap((entry) => [
    path.join(root, entry, "bin", executable),
    path.join(root, entry, "Contents", "Home", "bin", executable),
  ]);
  candidates.push(path.join(root, "bin", executable));
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Continue la recherche.
    }
  }
  return null;
}

function adoptiumOs(): string {
  if (process.platform === "win32") return "windows";
  if (process.platform === "darwin") return "mac";
  return "linux";
}

function adoptiumArch(): string {
  return process.arch === "arm64" ? "aarch64" : "x64";
}

async function extractArchive(
  archive: string,
  destination: string,
): Promise<void> {
  if (archive.endsWith(".zip")) {
    await extractZip(archive, { dir: destination });
  } else {
    await tar.x({ file: archive, cwd: destination });
  }
}

async function downloadJava(
  major: number,
  emit: Emit,
  log: Log,
): Promise<string> {
  const destination = runtimeDir(major);
  await fs.rm(destination, { recursive: true, force: true });
  await fs.mkdir(destination, { recursive: true });

  const url = `https://api.adoptium.net/v3/binary/latest/${major}/ga/${adoptiumOs()}/${adoptiumArch()}/jre/hotspot/normal/eclipse`;
  emit({
    phase: "java",
    label: `Téléchargement de Java ${major}…`,
    percent: null,
  });
  log(`Téléchargement de Java ${major} depuis Adoptium…`);
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(15 * 60 * 1000),
  });
  if (!response.ok || !response.body) {
    throw new Error(`Téléchargement de Java échoué (HTTP ${response.status}).`);
  }
  await assertSafeRemoteUrl(response.url);

  const maximum = 512 * 1024 * 1024;
  const expected = Number(response.headers.get("content-length") ?? 0);
  if (expected > maximum) throw new Error("Archive Java trop volumineuse.");
  const extension = process.platform === "win32" ? "zip" : "tar.gz";
  const archive = path.join(destination, `jre.${extension}`);
  const handle = await fs.open(archive, "w");
  const reader = response.body.getReader();
  let received = 0;
  let streamError: unknown;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maximum) throw new Error("Archive Java trop volumineuse.");
      await handle.write(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    streamError = error;
  } finally {
    await handle.close();
  }
  if (streamError) {
    await fs.rm(archive, { force: true });
    throw streamError;
  }
  if (expected && expected !== received) {
    await fs.rm(archive, { force: true });
    throw new Error(
      `Téléchargement de Java incomplet (${received}/${expected} octets).`,
    );
  }

  emit({
    phase: "java",
    label: `Installation de Java ${major}…`,
    percent: null,
  });
  log(`Extraction de Java ${major} (${(received / 1_048_576).toFixed(0)} Mo)…`);
  try {
    await extractArchive(archive, destination);
  } finally {
    await fs.rm(archive, { force: true });
  }
  const binary = await findJavaBinary(destination);
  if (!binary) throw new Error("Binaire Java introuvable après extraction.");
  log(`Java ${major} installé : ${binary}`);
  return binary;
}

/**
 * Priorité : JACH_JAVA_PATH > runtime téléchargé > Java système compatible >
 * runtime Temurin téléchargé automatiquement.
 */
export async function ensureJava(
  manifest: LauncherManifest,
  emit: Emit,
  log: Log,
): Promise<string | undefined> {
  if (process.env.JACH_JAVA_PATH) {
    await fs.access(process.env.JACH_JAVA_PATH);
    log(`Java forcé par JACH_JAVA_PATH : ${process.env.JACH_JAVA_PATH}`);
    return process.env.JACH_JAVA_PATH;
  }

  const wanted = await resolveRequiredJavaMajor(manifest);
  emit({
    phase: "java",
    label: `Vérification de Java ${wanted}…`,
    percent: null,
  });
  const cached = await findJavaBinary(runtimeDir(wanted));
  if (cached) {
    log(`Java ${wanted} en cache : ${cached}`);
    return cached;
  }

  const systemMajor = await detectSystemJavaMajor();
  const compatible =
    systemMajor !== null &&
    (wanted >= 17 ? systemMajor >= wanted : systemMajor === wanted);
  if (compatible) {
    log(`Java système compatible (v${systemMajor}).`);
    return undefined;
  }
  if (systemMajor === null) log("Aucun Java système détecté.");
  else log(`Java système v${systemMajor} incompatible (requis : ${wanted}).`);
  return downloadJava(wanted, emit, log);
}
