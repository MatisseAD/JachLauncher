import crypto from "node:crypto";
import { once } from "node:events";
import { createReadStream } from "node:fs";
import { promises as fs } from "node:fs";
import type { ChildProcess } from "node:child_process";
import path from "node:path";
import { launch, Version } from "@xmcl/core";
import {
  getFabricLoaderArtifact,
  getLoaderArtifactListFor,
  getQuiltLoaderVersionsByMinecraft,
  getVersionList,
  install,
  installDependencies,
  installFabric,
  installForge,
  installNeoForged,
  installQuiltVersion,
} from "@xmcl/installer";
import type { DownloadableFile, LauncherManifest } from "@jach/shared";
import type { LaunchProgress, LauncherSettings } from "../shared-types/ipc";
import { getCurrentAuth } from "./auth";
import { markInstanceInstalled } from "./instance";
import { ensureJava } from "./java";
import {
  assertSafeRemoteUrl,
  manifestFingerprint,
  resolveInside,
} from "./security";
import { ensureMinecraftRoot } from "./store";

type Emit = (progress: LaunchProgress) => void;
type Log = (line: string) => void;
type ContentDirectory = "mods" | "resourcepacks" | "shaderpacks";

interface ContentJob {
  file: DownloadableFile;
  directory: ContentDirectory;
}

interface ContentIndex {
  schemaVersion: 1;
  manifestFingerprint: string;
  updatedAt: string;
  files: Array<{
    directory: ContentDirectory;
    fileName: string;
    sha256: string;
  }>;
}

const VERSION_MANIFEST =
  "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
const FORGE_METADATA =
  "https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml";
const NEOFORGE_METADATA =
  "https://maven.neoforged.net/releases/net/neoforged/neoforge/maven-metadata.xml";
const NEOFORGED_FORGE_METADATA =
  "https://maven.neoforged.net/releases/net/neoforged/forge/maven-metadata.xml";

async function fileExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

async function sha256OfFile(target: string): Promise<string> {
  const hash = crypto.createHash("sha256");
  for await (const chunk of createReadStream(target)) hash.update(chunk);
  return hash.digest("hex");
}

async function downloadVerified(
  file: DownloadableFile,
  destination: string,
): Promise<void> {
  if (
    (await fileExists(destination)) &&
    (await sha256OfFile(destination)) === file.sha256
  ) {
    return;
  }

  const url = await assertSafeRemoteUrl(file.url, { allowLocalhost: true });
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(15 * 60 * 1000),
  });
  await assertSafeRemoteUrl(response.url, { allowLocalhost: true });
  if (!response.ok || !response.body) {
    throw new Error(
      `Téléchargement échoué (HTTP ${response.status}) : ${file.name}`,
    );
  }

  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength && declaredLength !== file.size) {
    throw new Error(
      `Taille annoncée incorrecte pour ${file.fileName} (${declaredLength}/${file.size}).`,
    );
  }

  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.part`;
  const handle = await fs.open(temporary, "w");
  const hash = crypto.createHash("sha256");
  const reader = response.body.getReader();
  let received = 0;
  let streamError: unknown;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > file.size) {
        throw new Error(`Fichier trop volumineux : ${file.fileName}`);
      }
      hash.update(value);
      await handle.write(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined);
    streamError = error;
  } finally {
    await handle.close();
  }
  if (streamError) {
    await fs.rm(temporary, { force: true });
    throw streamError;
  }

  try {
    if (received !== file.size) {
      throw new Error(
        `Téléchargement incomplet pour ${file.fileName} (${received}/${file.size} octets).`,
      );
    }
    const actualHash = hash.digest("hex");
    if (actualHash !== file.sha256) {
      throw new Error(`SHA-256 incorrect pour ${file.fileName}.`);
    }
    await fs.rm(destination, { force: true });
    await fs.rename(temporary, destination);
  } catch (error) {
    await fs.rm(temporary, { force: true });
    throw error;
  }
}

function contentJobs(manifest: LauncherManifest): ContentJob[] {
  return [
    ...manifest.mods
      .filter((file) => file.required)
      .map((file) => ({ file, directory: "mods" as const })),
    ...manifest.resourcepacks
      .filter((file) => file.required)
      .map((file) => ({ file, directory: "resourcepacks" as const })),
    ...manifest.shaderpacks
      .filter((file) => file.required)
      .map((file) => ({ file, directory: "shaderpacks" as const })),
  ];
}

async function readContentIndex(root: string): Promise<ContentIndex | null> {
  try {
    const raw = await fs.readFile(
      resolveInside(root, ".jach-content.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as ContentIndex;
    return parsed.schemaVersion === 1 && Array.isArray(parsed.files)
      ? parsed
      : null;
  } catch {
    return null;
  }
}

/** Supprime uniquement les fichiers précédemment enregistrés comme gérés. */
export async function removeManagedContent(
  root: string,
  log: Log,
): Promise<void> {
  const previous = await readContentIndex(root);
  for (const managed of previous?.files ?? []) {
    await fs.rm(resolveInside(root, managed.directory, managed.fileName), {
      force: true,
    });
    log(`Nettoyé : ${managed.directory}/${managed.fileName}`);
  }
  await fs.rm(resolveInside(root, ".jach-content.json"), { force: true });
}

async function syncContent(
  manifest: LauncherManifest,
  root: string,
  emit: Emit,
  log: Log,
): Promise<void> {
  const jobs = contentJobs(manifest);
  const wanted = new Set(
    jobs.map(({ directory, file }) =>
      `${directory}/${file.fileName}`.toLowerCase(),
    ),
  );
  const previous = await readContentIndex(root);

  for (const managed of previous?.files ?? []) {
    const key = `${managed.directory}/${managed.fileName}`.toLowerCase();
    if (!wanted.has(key)) {
      await fs.rm(resolveInside(root, managed.directory, managed.fileName), {
        force: true,
      });
      log(`Supprimé (obsolète) : ${managed.directory}/${managed.fileName}`);
    }
  }

  for (const [index, { file, directory }] of jobs.entries()) {
    emit({
      phase: "downloading",
      label: `Synchronisation : ${file.name}`,
      percent: Math.round((index / Math.max(1, jobs.length)) * 100),
    });
    const destination = resolveInside(root, directory, file.fileName);
    log(`Vérification : ${directory}/${file.fileName}`);
    await downloadVerified(file, destination);
  }

  const index: ContentIndex = {
    schemaVersion: 1,
    manifestFingerprint: manifestFingerprint(manifest),
    updatedAt: new Date().toISOString(),
    files: jobs.map(({ directory, file }) => ({
      directory,
      fileName: file.fileName,
      sha256: file.sha256,
    })),
  };
  const target = resolveInside(root, ".jach-content.json");
  await fs.writeFile(`${target}.part`, JSON.stringify(index, null, 2), "utf8");
  await fs.rename(`${target}.part`, target);
  emit({ phase: "downloading", label: "Contenu synchronisé", percent: 100 });
}

async function fetchMavenVersions(url: string): Promise<string[]> {
  await assertSafeRemoteUrl(url);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) {
    throw new Error(
      `Métadonnées du loader indisponibles (HTTP ${response.status}).`,
    );
  }
  const xml = await response.text();
  return [...xml.matchAll(/<version>([^<]+)<\/version>/g)]
    .map((match) => match[1].trim())
    .filter((version) => /^[a-zA-Z0-9][a-zA-Z0-9._+-]*$/.test(version));
}

function latestVersion(versions: string[]): string {
  const selected = versions.at(-1);
  if (!selected) throw new Error("Aucune version compatible du loader.");
  return selected;
}

async function installLoader(
  manifest: LauncherManifest,
  root: string,
  javaPath: string,
  log: Log,
): Promise<string> {
  const minecraftVersion = manifest.minecraft.version;
  const requested = manifest.minecraft.loaderVersion;

  if (manifest.minecraft.loader === "vanilla") return minecraftVersion;

  if (manifest.minecraft.loader === "fabric") {
    let loaderVersion = requested;
    if (loaderVersion) {
      await getFabricLoaderArtifact(minecraftVersion, loaderVersion);
    } else {
      const candidates = await getLoaderArtifactListFor(minecraftVersion);
      loaderVersion = candidates[0]?.loader.version;
    }
    if (!loaderVersion) throw new Error("Aucune version Fabric compatible.");
    log(`Installation de Fabric ${loaderVersion}…`);
    return installFabric({
      minecraftVersion,
      version: loaderVersion,
      minecraft: root,
      side: "client",
    });
  }

  if (manifest.minecraft.loader === "quilt") {
    let loaderVersion = requested;
    if (!loaderVersion) {
      const candidates = await getQuiltLoaderVersionsByMinecraft({
        minecraftVersion,
      });
      loaderVersion = candidates[0]?.loader.version;
    }
    if (!loaderVersion) throw new Error("Aucune version Quilt compatible.");
    log(`Installation de Quilt ${loaderVersion}…`);
    return installQuiltVersion({
      minecraftVersion,
      version: loaderVersion,
      minecraft: root,
      side: "client",
    });
  }

  if (manifest.minecraft.loader === "forge") {
    const all = await fetchMavenVersions(FORGE_METADATA);
    const compatible = all.filter((version) =>
      version.startsWith(`${minecraftVersion}-`),
    );
    const fullVersion = requested
      ? requested.startsWith(`${minecraftVersion}-`)
        ? requested
        : `${minecraftVersion}-${requested}`
      : latestVersion(compatible);
    if (!compatible.includes(fullVersion)) {
      throw new Error(`Forge ${fullVersion} n’existe pas.`);
    }
    const forgeVersion = fullVersion.slice(minecraftVersion.length + 1);
    log(`Installation de Forge ${forgeVersion}…`);
    return installForge(
      { mcversion: minecraftVersion, version: forgeVersion },
      root,
      {
        java: javaPath,
        mavenHost: "https://maven.minecraftforge.net",
        side: "client",
      },
    );
  }

  const modernPrefix = minecraftVersion.split(".").slice(1).join(".");
  const explicitLegacy = requested?.startsWith(`${minecraftVersion}-`) ?? false;
  let project: "neoforge" | "forge" = explicitLegacy ? "forge" : "neoforge";
  let metadata =
    project === "forge" ? NEOFORGED_FORGE_METADATA : NEOFORGE_METADATA;
  let versions = await fetchMavenVersions(metadata);
  let compatible = versions.filter((version) =>
    project === "forge"
      ? version.startsWith(`${minecraftVersion}-`)
      : version.startsWith(`${modernPrefix}.`),
  );
  if (!requested && !compatible.length) {
    project = "forge";
    metadata = NEOFORGED_FORGE_METADATA;
    versions = await fetchMavenVersions(metadata);
    compatible = versions.filter((version) =>
      version.startsWith(`${minecraftVersion}-`),
    );
  }
  const neoVersion = requested ?? latestVersion(compatible);
  if (!versions.includes(neoVersion)) {
    throw new Error(`NeoForge ${neoVersion} n’existe pas.`);
  }
  log(`Installation de NeoForge ${neoVersion}…`);
  return installNeoForged(project, neoVersion, root, {
    java: javaPath,
    mavenHost: "https://maven.neoforged.net/releases",
    side: "client",
  });
}

async function installGame(
  manifest: LauncherManifest,
  root: string,
  javaPath: string,
  emit: Emit,
  log: Log,
): Promise<string> {
  emit({
    phase: "downloading",
    label: "Installation de Minecraft…",
    percent: null,
  });
  const list = await getVersionList({ remote: VERSION_MANIFEST });
  const metadata = list.versions.find(
    (version) => version.id === manifest.minecraft.version,
  );
  if (!metadata) {
    throw new Error(
      `Version Minecraft inconnue : ${manifest.minecraft.version}`,
    );
  }
  log(`Vérification de Minecraft ${metadata.id}…`);
  await install(metadata, root, { side: "client" });

  emit({
    phase: "downloading",
    label: "Installation du mod loader…",
    percent: null,
  });
  const versionId = await installLoader(manifest, root, javaPath, log);
  const resolved = await Version.parse(root, versionId);
  await installDependencies(resolved, { side: "client" });
  return versionId;
}

/** Prépare intégralement l'instance puis démarre le processus Minecraft. */
export async function launchGame(
  manifest: LauncherManifest,
  baseUrl: string,
  settings: LauncherSettings,
  emit: Emit,
  log: Log,
): Promise<ChildProcess> {
  const auth = getCurrentAuth();
  if (!auth) throw new Error("Aucun compte connecté.");

  const root = await ensureMinecraftRoot(baseUrl, manifest.id);
  await fs.mkdir(root, { recursive: true });

  const javaPath = (await ensureJava(manifest, emit, log)) ?? "java";
  const versionId = await installGame(manifest, root, javaPath, emit, log);
  await syncContent(manifest, root, emit, log);

  emit({ phase: "launching", label: "Lancement de Minecraft…", percent: null });
  const maxMemory = Math.min(
    65_536,
    Math.max(512, settings.ramMb || manifest.memory.max),
  );
  const minMemory = Math.min(manifest.memory.min, maxMemory);
  const [width, height] = settings.resolution
    .split("x")
    .map((part) => Number.parseInt(part, 10));
  const server = manifest.server.address
    ? { ip: manifest.server.address, port: manifest.server.port }
    : undefined;
  const releaseParts = /^1\.(\d+)(?:\.(\d+))?$/.exec(
    manifest.minecraft.version,
  );
  const supportsQuickPlay =
    releaseParts !== null && Number.parseInt(releaseParts[1], 10) >= 20;

  const child = await launch({
    gameProfile: { name: auth.name, id: auth.uuid.replaceAll("-", "") },
    accessToken: auth.access_token,
    userType: auth.meta?.type === "offline" ? "legacy" : "mojang",
    properties: JSON.parse(auth.user_properties || "{}") as object,
    launcherName: "JachLauncher",
    launcherBrand: "JachLauncher",
    gamePath: root,
    resourcePath: root,
    javaPath,
    minMemory,
    maxMemory,
    version: versionId,
    server: supportsQuickPlay ? undefined : server,
    quickPlayMultiplayer:
      supportsQuickPlay && server
        ? `${server.ip}${server.port ? `:${server.port}` : ""}`
        : undefined,
    resolution: {
      width: Number.isFinite(width) ? width : 1280,
      height: Number.isFinite(height) ? height : 720,
      fullscreen: settings.fullscreen,
    },
    extraJVMArgs: manifest.jvmArgs,
    extraExecOption: { detached: true },
  });

  child.stdout?.on("data", (data: Buffer) => log(data.toString().trim()));
  child.stderr?.on("data", (data: Buffer) =>
    log(`[stderr] ${data.toString().trim()}`),
  );
  child.once("error", (error) => {
    log(`Erreur du processus Minecraft : ${error.message}`);
    emit({
      phase: "error",
      label: "Le processus Minecraft a échoué",
      percent: null,
    });
  });
  child.once("close", (code, signal) => {
    log(`Minecraft fermé (code ${code ?? "?"}, signal ${signal ?? "aucun"}).`);
    emit({ phase: "closed", label: "Jeu fermé", percent: null });
  });

  if (!child.pid) {
    await Promise.race([
      once(child, "spawn"),
      once(child, "error").then(([error]) => Promise.reject(error)),
    ]);
  }
  await markInstanceInstalled(manifest, versionId, baseUrl);
  emit({ phase: "running", label: "Minecraft est lancé 🎮", percent: 100 });
  return child;
}
