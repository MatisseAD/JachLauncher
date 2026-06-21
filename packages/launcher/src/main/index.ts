import { app, BrowserWindow, ipcMain, shell } from "electron";
import path from "node:path";
import { existsSync } from "node:fs";
import type { LauncherManifest } from "@jach/shared";
import type { LaunchProgress, LauncherState, LauncherSettings } from "../shared-types/ipc";
import { loadState, saveState } from "./store";
import { fetchManifest } from "./manifest";
import { fetchServerStatus } from "./server-status";
import { getSystemInfo } from "./system";
import { repairInstance } from "./repair";
import { classifyError, buildReport } from "./diagnostics";
import {
  loginMicrosoft,
  setOfflineAccount,
  rehydrateOffline,
  clearAuth,
} from "./auth";
import { launchGame } from "./launch";

let mainWindow: BrowserWindow | null = null;
let state: LauncherState;
let currentManifest: LauncherManifest | null = null;
let lastError: string | null = null;
const logBuffer: string[] = [];

function createWindow(): void {
  // Icône de fenêtre/taskbar (build/icon.png), si présente.
  const iconPath = path.join(__dirname, "../../build/icon.png");

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 880,
    minHeight: 600,
    show: false,
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: "#0b0814",
    ...(existsSync(iconPath) ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.on("ready-to-show", () => mainWindow?.show());

  // Ouvre les liens externes dans le navigateur.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

function emitProgress(p: LaunchProgress): void {
  mainWindow?.webContents.send("launch:progress", p);
}
function emitLog(line: string): void {
  logBuffer.push(line);
  if (logBuffer.length > 200) logBuffer.shift();
  mainWindow?.webContents.send("launch:log", line);
}

function registerIpc(): void {
  ipcMain.handle("state:get", async () => state);

  ipcMain.handle("state:setBaseUrl", async (_e, baseUrl: string) => {
    state.baseUrl = baseUrl;
    await saveState(state);
  });

  ipcMain.handle("manifest:load", async (_e, slug: string, baseUrl?: string) => {
    if (baseUrl) state.baseUrl = baseUrl;
    const result = await fetchManifest(state.baseUrl, slug);
    if (result.ok && result.manifest) {
      currentManifest = result.manifest;
      state.slug = slug;
      // Enregistre/actualise ce launcher dans la liste (changement à la volée).
      const b = result.manifest.branding;
      const entry = { slug, baseUrl: state.baseUrl, title: b.title, logoUrl: b.logoUrl };
      const others = state.launchers.filter((l) => l.slug !== slug);
      state.launchers = [entry, ...others];
      await saveState(state);
    }
    return result;
  });

  ipcMain.handle("launchers:remove", async (_e, slug: string) => {
    state.launchers = state.launchers.filter((l) => l.slug !== slug);
    if (state.slug === slug) state.slug = null;
    await saveState(state);
    return state.launchers;
  });

  ipcMain.handle("auth:microsoft", async () => {
    const result = await loginMicrosoft();
    if (result.ok && result.account) {
      state.account = result.account;
      await saveState(state);
    }
    return result;
  });

  ipcMain.handle("auth:offline", async (_e, username: string) => {
    const result = setOfflineAccount(username);
    if (result.ok && result.account) {
      state.account = result.account;
      await saveState(state);
    }
    return result;
  });

  ipcMain.handle("auth:logout", async () => {
    clearAuth();
    state.account = null;
    await saveState(state);
  });

  ipcMain.handle("game:launch", async () => {
    if (!currentManifest) return { ok: false, error: "Aucun launcher chargé." };
    lastError = null;
    try {
      await launchGame(currentManifest, state.settings, emitProgress, emitLog);
      return { ok: true };
    } catch (e) {
      const msg = String(e);
      lastError = msg;
      emitLog(`ERREUR: ${msg}`);
      const diagnostic = classifyError(msg);
      emitProgress({ phase: "error", label: diagnostic.title, percent: null });
      return { ok: false, error: msg, diagnostic };
    }
  });

  // Réparation du launcher.
  ipcMain.handle("game:repair", async () => {
    if (!state.slug) return { ok: false, error: "Aucun launcher chargé." };
    try {
      await repairInstance(state.slug, emitProgress, emitLog);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });

  // Infos système (RAM).
  ipcMain.handle("system:info", async () => getSystemInfo());

  // Rapport de diagnostic copiable.
  ipcMain.handle("diag:report", async () => {
    const m = currentManifest;
    return buildReport({
      slug: state.slug,
      manifestSummary: m ? `${m.minecraft.version} / ${m.minecraft.loader} / ${m.mods.length} mods` : undefined,
      settingsSummary: `RAM ${state.settings.ramMb}Mo (${state.settings.ramMode}), ${state.settings.resolution}`,
      lastError: lastError ?? undefined,
      logTail: logBuffer,
    });
  });

  // Marque le parcours de première installation comme vu.
  ipcMain.handle("intro:seen", async () => {
    state.seenIntro = true;
    await saveState(state);
  });

  // Statut du serveur Minecraft.
  ipcMain.handle("server:status", async (_e, address: string, port?: number) =>
    fetchServerStatus(address, port),
  );

  // Réglages.
  ipcMain.handle("settings:get", async () => state.settings);
  ipcMain.handle("settings:set", async (_e, key: keyof LauncherSettings, value: unknown) => {
    state.settings = { ...state.settings, [key]: value } as LauncherSettings;
    await saveState(state);
  });

  // Contrôles de fenêtre (fenêtre sans cadre).
  ipcMain.on("win:minimize", () => mainWindow?.minimize());
  ipcMain.on("win:close", () => mainWindow?.close());
  ipcMain.on("win:toggleFullscreen", () => {
    if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });
}

app.whenReady().then(async () => {
  state = await loadState();
  // Réhydrate l'autorisation hors-ligne (les comptes Microsoft doivent se reconnecter).
  if (state.account) rehydrateOffline(state.account);

  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
