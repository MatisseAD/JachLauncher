import { promises as fs, createWriteStream } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { Client } from "minecraft-launcher-core";
import { loader as tomateLoader } from "tomate-loaders";
import type { LauncherManifest, DownloadableFile } from "@jach/shared";
import type { LaunchProgress, LauncherSettings } from "../shared-types/ipc";
import { minecraftRoot } from "./store";
import { getCurrentAuth } from "./auth";
import { ensureJava } from "./java";

type Emit = (p: LaunchProgress) => void;
type Log = (line: string) => void;

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function sha1OfFile(p: string): Promise<string> {
  const buf = await fs.readFile(p);
  return crypto.createHash("sha1").update(buf).digest("hex");
}

/** Télécharge un fichier (avec vérif SHA-1 et cache si déjà présent). */
async function downloadTo(url: string, dest: string, sha1?: string): Promise<void> {
  if (sha1 && (await fileExists(dest))) {
    if ((await sha1OfFile(dest)) === sha1.toLowerCase()) return; // déjà à jour
  }
  await fs.mkdir(path.dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Téléchargement échoué (${res.status}) : ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (sha1) {
    const got = crypto.createHash("sha1").update(buf).digest("hex");
    if (got !== sha1.toLowerCase()) {
      throw new Error(`SHA-1 incorrect pour ${path.basename(dest)}`);
    }
  }
  await fs.writeFile(dest, buf);
}

/**
 * Installe un mod loader basé sur un "profile JSON" (Fabric, Quilt) et
 * retourne l'id de version custom à passer à MCLC.
 */
async function installProfileLoader(
  manifest: LauncherManifest,
  root: string,
  metaBase: string,
  log: Log,
): Promise<string> {
  const mc = manifest.minecraft.version;
  let loaderVersion = manifest.minecraft.loaderVersion;

  if (!loaderVersion) {
    const res = await fetch(`${metaBase}/versions/loader/${mc}`);
    if (!res.ok) throw new Error("Impossible de lister les versions du loader");
    const list = (await res.json()) as Array<{ loader: { version: string } }>;
    if (!list.length) throw new Error(`Aucun loader pour Minecraft ${mc}`);
    loaderVersion = list[0].loader.version;
    log(`Loader auto-sélectionné : ${loaderVersion}`);
  }

  const profileRes = await fetch(
    `${metaBase}/versions/loader/${mc}/${loaderVersion}/profile/json`,
  );
  if (!profileRes.ok) throw new Error("Profil du loader introuvable");
  const profile = (await profileRes.json()) as { id: string };

  const versionDir = path.join(root, "versions", profile.id);
  await fs.mkdir(versionDir, { recursive: true });
  await fs.writeFile(
    path.join(versionDir, `${profile.id}.json`),
    JSON.stringify(profile),
    "utf8",
  );
  log(`Profil de version écrit : ${profile.id}`);
  return profile.id;
}

/** Télécharge les mods et resource packs définis dans le manifeste. */
async function downloadContent(
  manifest: LauncherManifest,
  root: string,
  emit: Emit,
  log: Log,
): Promise<void> {
  const jobs: Array<{ file: DownloadableFile; dir: string }> = [
    ...manifest.mods.filter((m) => m.required).map((file) => ({ file, dir: "mods" })),
    ...manifest.resourcepacks.map((file) => ({ file, dir: "resourcepacks" })),
  ];
  if (jobs.length === 0) return;

  let done = 0;
  for (const { file, dir } of jobs) {
    emit({
      phase: "downloading",
      label: `Téléchargement : ${file.name}`,
      percent: Math.round((done / jobs.length) * 100),
    });
    log(`↓ ${file.fileName}`);
    await downloadTo(file.url, path.join(root, dir, file.fileName), file.sha1);
    done++;
  }
  emit({ phase: "downloading", label: "Contenu téléchargé", percent: 100 });
}

/**
 * Point d'entrée : prépare l'instance et lance Minecraft selon le manifeste.
 */
export async function launchGame(
  manifest: LauncherManifest,
  settings: LauncherSettings,
  emit: Emit,
  log: Log,
): Promise<void> {
  const auth = getCurrentAuth();
  if (!auth) throw new Error("Aucun compte connecté.");

  const root = minecraftRoot(manifest.id);
  await fs.mkdir(root, { recursive: true });

  // 1) Mod loader.
  //    - Fabric/Quilt : profil "meta" officiel (respecte loaderVersion).
  //    - Forge/NeoForge : via tomate-loaders (gère le téléchargement de
  //      l'installeur ; MCLC l'exécute ensuite). Utilise la dernière version.
  emit({ phase: "java", label: "Préparation du mod loader…", percent: null });
  let customVersion: string | undefined;
  let loaderOpts: Record<string, unknown> = {};
  const loader = manifest.minecraft.loader;

  if (loader === "fabric") {
    customVersion = await installProfileLoader(manifest, root, "https://meta.fabricmc.net/v2", log);
  } else if (loader === "quilt") {
    customVersion = await installProfileLoader(manifest, root, "https://meta.quiltmc.org/v3", log);
  } else if (loader === "forge" || loader === "neoforge") {
    log(`Préparation de ${loader} (téléchargement de l'installeur)…`);
    const cfg = await tomateLoader(loader).getMCLCLaunchConfig({
      rootPath: root,
      gameVersion: manifest.minecraft.version,
    });
    // cfg = { root, version: { number, type, custom }, forge: <installer path> }
    customVersion = cfg.version.custom;
    if (cfg.forge) loaderOpts.forge = cfg.forge;
    log(`${loader} prêt : ${customVersion}`);
  }

  // 2) Mods + resource packs.
  await downloadContent(manifest, root, emit, log);

  // 3) Java : détection / installation automatique si nécessaire.
  const javaPath = await ensureJava(manifest, emit, log);

  // 4) Lancement via minecraft-launcher-core.
  emit({ phase: "launching", label: "Lancement de Minecraft…", percent: null });

  // La RAM des réglages prime sur celle du manifeste.
  const maxRam = settings.ramMb || manifest.memory.max;
  const minRam = Math.min(manifest.memory.min, maxRam);
  const [resW, resH] = (settings.resolution || "1280x720").split("x").map((n) => parseInt(n) || 0);

  const client = new Client();
  const opts: any = {
    authorization: auth,
    root,
    version: {
      number: manifest.minecraft.version,
      type: "release",
      ...(customVersion ? { custom: customVersion } : {}),
    },
    memory: {
      max: `${maxRam}M`,
      min: `${minRam}M`,
    },
    window: resW && resH ? { width: resW, height: resH, fullscreen: settings.fullscreen } : undefined,
    customArgs: manifest.jvmArgs,
    overrides: { maxSockets: 4 },
    ...loaderOpts, // forge/neoforge : chemin de l'installeur
  };

  // Java auto-détecté/installé (sinon PATH système).
  if (javaPath) opts.javaPath = javaPath;

  client.on("debug", (line: string) => log(`[debug] ${line}`));
  client.on("data", (line: string) => log(line.toString().trim()));

  // Libellés clairs selon le type d'étape MCLC.
  const stepLabel: Record<string, string> = {
    assets: "Vérification des fichiers du jeu…",
    "assets-copy": "Vérification des ressources…",
    natives: "Optimisation du lancement…",
    classes: "Optimisation du lancement…",
    "classes-custom": "Préparation des mods…",
  };
  client.on("progress", (e: { type: string; task: number; total: number }) => {
    const percent = e.total ? Math.round((e.task / e.total) * 100) : null;
    emit({ phase: "downloading", label: stepLabel[e.type] ?? "Vérification des fichiers…", percent });
  });

  client.on("download-status", (e: { current: number; total: number }) => {
    const percent = e.total ? Math.round((e.current / e.total) * 100) : null;
    emit({ phase: "downloading", label: "Téléchargement des fichiers du jeu…", percent });
  });

  client.on("close", (code: number) => {
    log(`Minecraft fermé (code ${code}).`);
    emit({ phase: "closed", label: "Jeu fermé", percent: null });
  });

  await client.launch(opts);
  emit({ phase: "running", label: "Minecraft démarre… 🎮", percent: 100 });
}
