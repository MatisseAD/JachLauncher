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
  trustedManifestFingerprints: [],
  trustedManifestSigners: [],
};

function settingsPath(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

export async function loadState(): Promise<LauncherState> {
  try {
    const raw = await fs.readFile(settingsPath(), "utf8");
    const parsed = JSON.parse(raw);
    const launchers = Array.isArray(parsed.launchers)
      ? parsed.launchers
          .filter(
            (item: unknown) =>
              item &&
              typeof item === "object" &&
              typeof (item as Record<string, unknown>).slug === "string" &&
              typeof (item as Record<string, unknown>).baseUrl === "string",
          )
          .map((item: Record<string, unknown>) => ({
            id:
              typeof item.id === "string"
                ? item.id
                : `${item.baseUrl}#${item.slug}`,
            slug: String(item.slug),
            baseUrl: String(item.baseUrl),
            title:
              typeof item.title === "string" ? item.title : String(item.slug),
            logoUrl:
              typeof item.logoUrl === "string" ? item.logoUrl : undefined,
          }))
      : [];
    const account = parsed.account?.type === "offline" ? parsed.account : null;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      account,
      settings: sanitizeSettings(parsed.settings),
      launchers,
      trustedManifestFingerprints: Array.isArray(
        parsed.trustedManifestFingerprints,
      )
        ? parsed.trustedManifestFingerprints
            .filter(
              (item: unknown) =>
                typeof item === "string" && /^[0-9a-f]{64}$/.test(item),
            )
            .slice(-100)
        : [],
      trustedManifestSigners: Array.isArray(parsed.trustedManifestSigners)
        ? parsed.trustedManifestSigners
            .filter(
              (item: unknown) =>
                typeof item === "string" &&
                /^https?:\/\/[^#]+#[a-z0-9-]{3,40}#[0-9a-f]{64}$/.test(item),
            )
            .slice(-100)
        : [],
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function sanitizeSettings(input: unknown): LauncherState["settings"] {
  const value =
    input && typeof input === "object"
      ? (input as Record<string, unknown>)
      : {};
  const ramMb =
    typeof value.ramMb === "number"
      ? Math.max(1024, Math.min(16384, Math.round(value.ramMb / 512) * 512))
      : DEFAULT_STATE.settings.ramMb;
  const ramModes = ["auto", "low", "balanced", "performance", "custom"];
  const resolutions = ["854x480", "1280x720", "1600x900", "1920x1080"];
  return {
    ramMb,
    ramMode: ramModes.includes(String(value.ramMode))
      ? (value.ramMode as LauncherState["settings"]["ramMode"])
      : DEFAULT_STATE.settings.ramMode,
    fullscreen:
      typeof value.fullscreen === "boolean"
        ? value.fullscreen
        : DEFAULT_STATE.settings.fullscreen,
    closeOnLaunch:
      typeof value.closeOnLaunch === "boolean"
        ? value.closeOnLaunch
        : DEFAULT_STATE.settings.closeOnLaunch,
    minimizeOnLaunch:
      typeof value.minimizeOnLaunch === "boolean"
        ? value.minimizeOnLaunch
        : DEFAULT_STATE.settings.minimizeOnLaunch,
    resolution: resolutions.includes(String(value.resolution))
      ? String(value.resolution)
      : DEFAULT_STATE.settings.resolution,
  };
}

export async function saveState(state: LauncherState): Promise<void> {
  await fs.mkdir(path.dirname(settingsPath()), { recursive: true });
  await fs.writeFile(settingsPath(), JSON.stringify(state, null, 2), "utf8");
}

/** Répertoire d'installation des instances Minecraft. */
export function minecraftRoot(slug: string): string {
  return path.join(app.getPath("userData"), "instances", slug);
}
