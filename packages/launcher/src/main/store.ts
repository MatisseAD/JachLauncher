import { app } from "electron";
import { promises as fs } from "node:fs";
import path from "node:path";
import { DEFAULT_SETTINGS, type LauncherState } from "../shared-types/ipc";

// Persistance simple en JSON dans le dossier userData d'Electron.
// (Évite une dépendance ESM comme electron-store.)

const DEFAULT_STATE: LauncherState = {
  baseUrl: process.env.JACH_BASE_URL ?? "http://localhost:3000",
  slug: null,
  account: null,
  settings: { ...DEFAULT_SETTINGS },
  seenIntro: false,
  launchers: [],
};

function settingsPath(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

export async function loadState(): Promise<LauncherState> {
  try {
    const raw = await fs.readFile(settingsPath(), "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      settings: { ...DEFAULT_STATE.settings, ...(parsed.settings ?? {}) },
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export async function saveState(state: LauncherState): Promise<void> {
  await fs.mkdir(path.dirname(settingsPath()), { recursive: true });
  await fs.writeFile(settingsPath(), JSON.stringify(state, null, 2), "utf8");
}

/** Répertoire d'installation des instances Minecraft. */
export function minecraftRoot(slug: string): string {
  return path.join(app.getPath("userData"), "instances", slug);
}
