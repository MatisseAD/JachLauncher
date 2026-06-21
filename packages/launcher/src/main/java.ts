import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import extractZip from "extract-zip";
import * as tar from "tar";
import type { LauncherManifest } from "@jach/shared";
import type { LaunchProgress } from "../shared-types/ipc";

type Emit = (p: LaunchProgress) => void;
type Log = (line: string) => void;

/**
 * Déduit la version majeure de Java requise.
 * Priorité au champ `javaMajor` du manifeste, sinon déduit de la version MC.
 */
export function requiredJavaMajor(manifest: LauncherManifest): number {
  if (manifest.minecraft.javaMajor) return manifest.minecraft.javaMajor;
  const v = manifest.minecraft.version.split(".").map((n) => parseInt(n) || 0);
  const minor = v[1] ?? 0;
  const patch = v[2] ?? 0;
  if (minor <= 16) return 8; // 1.16 et avant
  if (minor === 17) return 16; // 1.17
  if (minor < 20 || (minor === 20 && patch <= 4)) return 17; // 1.18 – 1.20.4
  return 21; // 1.20.5+ / 1.21+
}

/** Lit la version majeure du `java` du PATH, ou null si absent. */
export function detectSystemJavaMajor(): Promise<number | null> {
  return new Promise((resolve) => {
    execFile("java", ["-version"], (err, _stdout, stderr) => {
      if (err) return resolve(null);
      // ex: 'openjdk version "17.0.10"' ou 'java version "1.8.0_391"'
      const m = stderr.match(/version "(\d+)(?:\.(\d+))?/);
      if (!m) return resolve(null);
      const a = parseInt(m[1]);
      const major = a === 1 ? parseInt(m[2] ?? "0") : a; // "1.8" -> 8
      resolve(Number.isFinite(major) ? major : null);
    });
  });
}

function runtimeDir(major: number): string {
  return path.join(app.getPath("userData"), "runtime", `jdk-${major}`);
}

async function findJavaBinary(root: string): Promise<string | null> {
  // Cherche bin/java(.exe) sous l'un des sous-dossiers extraits.
  const exe = process.platform === "win32" ? "java.exe" : "java";
  const candidates: string[] = [];
  let entries: string[] = [];
  try {
    entries = await fs.readdir(root);
  } catch {
    return null;
  }
  for (const e of entries) {
    const base = path.join(root, e);
    candidates.push(
      path.join(base, "bin", exe), // win/linux
      path.join(base, "Contents", "Home", "bin", exe), // macOS
    );
  }
  // Cas où l'extraction est directement à la racine.
  candidates.push(path.join(root, "bin", exe));
  for (const c of candidates) {
    try {
      await fs.access(c);
      return c;
    } catch {
      /* continue */
    }
  }
  return null;
}

function adoptiumOs(): string {
  switch (process.platform) {
    case "win32":
      return "windows";
    case "darwin":
      return "mac";
    default:
      return "linux";
  }
}
function adoptiumArch(): string {
  return process.arch === "arm64" ? "aarch64" : "x64";
}

async function extractArchive(archive: string, dest: string): Promise<void> {
  // Extraction en JS pur (indépendante du `tar` système, dont le comportement
  // varie sur Windows). .zip -> extract-zip ; .tar.gz -> package tar.
  if (archive.endsWith(".zip")) {
    await extractZip(archive, { dir: dest }); // dest doit être absolu
  } else {
    await tar.x({ file: archive, cwd: dest });
  }
}

async function downloadJava(major: number, emit: Emit, log: Log): Promise<string> {
  const dest = runtimeDir(major);
  // Repart d'un dossier propre (supprime archives/extractions partielles).
  await fs.rm(dest, { recursive: true, force: true });
  await fs.mkdir(dest, { recursive: true });

  const url = `https://api.adoptium.net/v3/binary/latest/${major}/ga/${adoptiumOs()}/${adoptiumArch()}/jre/hotspot/normal/eclipse`;
  log(`Téléchargement de Java ${major} depuis Adoptium…`);
  emit({ phase: "java", label: `Téléchargement de Java ${major}…`, percent: null });

  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Téléchargement de Java échoué (HTTP ${res.status})`);

  // Téléchargement atomique via arrayBuffer (fiable dans Electron, contrairement
  // au streaming qui produisait des fichiers tronqués).
  const expected = Number(res.headers.get("content-length") ?? 0);
  const buf = Buffer.from(await res.arrayBuffer());
  if (expected && buf.length !== expected) {
    throw new Error(`Téléchargement de Java incomplet (${buf.length}/${expected} octets). Réessaie.`);
  }

  const ext = process.platform === "win32" ? "zip" : "tar.gz";
  const archive = path.join(dest, `jre.${ext}`);
  await fs.writeFile(archive, buf);

  emit({ phase: "java", label: `Installation de Java ${major}…`, percent: null });
  log(`Extraction de Java ${major} (${(buf.length / 1048576).toFixed(0)} Mo)…`);
  await extractArchive(archive, dest);
  await fs.rm(archive, { force: true });

  const bin = await findJavaBinary(dest);
  if (!bin) throw new Error("Binaire Java introuvable après extraction.");
  log(`Java ${major} installé : ${bin}`);
  return bin;
}

/**
 * Garantit qu'un Java compatible est disponible. Renvoie le chemin du binaire
 * `java` à utiliser, ou `undefined` pour utiliser celui du PATH système.
 *
 * Priorité : JACH_JAVA_PATH (env) > runtime téléchargé en cache > Java système
 * compatible > téléchargement Adoptium.
 */
export async function ensureJava(
  manifest: LauncherManifest,
  emit: Emit,
  log: Log,
): Promise<string | undefined> {
  if (process.env.JACH_JAVA_PATH) {
    log(`Java forcé (env) : ${process.env.JACH_JAVA_PATH}`);
    return process.env.JACH_JAVA_PATH;
  }

  const wanted = requiredJavaMajor(manifest);
  emit({ phase: "java", label: `Vérification de Java ${wanted}…`, percent: null });

  // 1) Runtime déjà téléchargé pour cette version ?
  const cached = await findJavaBinary(runtimeDir(wanted));
  if (cached) {
    log(`Java ${wanted} (cache) : ${cached}`);
    return cached;
  }

  // 2) Java système compatible ?
  const sys = await detectSystemJavaMajor();
  if (sys !== null) {
    const compatible = wanted >= 17 ? sys >= wanted : sys === wanted;
    if (compatible) {
      log(`Java système compatible (v${sys}) — utilisé.`);
      return undefined; // MCLC utilisera le PATH
    }
    log(`Java système v${sys} incompatible (requis : ${wanted}).`);
  } else {
    log("Aucun Java détecté sur le système.");
  }

  // 3) Téléchargement automatique.
  return downloadJava(wanted, emit, log);
}
