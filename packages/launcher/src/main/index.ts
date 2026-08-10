import { existsSync } from "node:fs";
import path from "node:path";
import { app, BrowserWindow, ipcMain, shell } from "electron";
import type { LauncherManifest } from "@jach/shared";
import type {
  LaunchProgress,
  LauncherSettings,
  LauncherState,
  LoadManifestResult,
} from "../shared-types/ipc";
import {
  cancelMicrosoftLogin,
  clearAuth,
  clearMicrosoftSession,
  ensureMicrosoftAuthorizationFresh,
  getCurrentAuth,
  loginMicrosoft,
  rehydrateOffline,
  restoreMicrosoftAccount,
  setOfflineAccount,
} from "./auth";
import { buildReport, classifyError } from "./diagnostics";
import { getInstanceStatus } from "./instance";
import { ADMIN_CENTER_URL, assertFixedAdminCenterUrl } from "./external-links";
import {
  checkLauncherAccess,
  LauncherAccessPolicyError,
} from "./launcher-access";
import { launchGame } from "./launch";
import { authorizationMatchesAccount } from "./launch-auth";
import { fetchManifest } from "./manifest";
import { repairInstance } from "./repair";
import {
  manifestFingerprint,
  normalizeBaseUrl,
  safeExternalUrl,
  verifyManifestSignature,
} from "./security";
import { fetchServerStatus } from "./server-status";
import { loadState, sanitizeSettings, saveState } from "./store";
import { getSystemInfo } from "./system";
import { setupAutoUpdates, type AutoUpdateController } from "./updater";

let mainWindow: BrowserWindow | null = null;
let state: LauncherState;
let currentManifest: LauncherManifest | null = null;
let currentManifestBaseUrl: string | null = null;
let pendingManifest: {
  manifest: LauncherManifest;
  baseUrl: string;
  fingerprint: string;
  signerTrustId?: string;
} | null = null;
let lastError: string | null = null;
let busyOperation: "launch" | "repair" | null = null;
const logBuffer: string[] = [];
let autoUpdates: AutoUpdateController | null = null;
let authRevision = 0;

function createWindow(): void {
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
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.once("closed", () => {
    mainWindow = null;
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    try {
      void shell.openExternal(safeExternalUrl(url));
    } catch {
      // Un protocole non web n'est jamais transmis au système.
    }
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    const current = mainWindow?.webContents.getURL();
    if (current && url !== current) {
      event.preventDefault();
      try {
        void shell.openExternal(safeExternalUrl(url));
      } catch {
        // Navigation refusée.
      }
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

function emitProgress(progress: LaunchProgress): void {
  mainWindow?.webContents.send("launch:progress", progress);
}

function emitLog(line: string): void {
  if (!line) return;
  logBuffer.push(line);
  if (logBuffer.length > 200) logBuffer.shift();
  mainWindow?.webContents.send("launch:log", line);
}

function emitAccountState(): void {
  mainWindow?.webContents.send("auth:accountChanged", state.account);
}

async function activateManifest(
  manifest: LauncherManifest,
  baseUrl: string,
): Promise<LoadManifestResult> {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  currentManifest = manifest;
  currentManifestBaseUrl = normalizedBaseUrl;
  pendingManifest = null;
  state.baseUrl = normalizedBaseUrl;
  state.slug = manifest.id;
  const branding = manifest.branding;
  const id = `${normalizedBaseUrl}#${manifest.id}`;
  state.launchers = [
    {
      id,
      slug: manifest.id,
      baseUrl: normalizedBaseUrl,
      title: branding.title,
      logoUrl: branding.logoUrl,
    },
    ...state.launchers.filter((launcher) => launcher.id !== id),
  ].slice(0, 50);
  await saveState(state);
  return {
    ok: true,
    manifest,
    fingerprint: manifestFingerprint(manifest),
    trusted: true,
    signature: verifyManifestSignature(manifest),
  };
}

function registerIpc(): void {
  ipcMain.handle("state:get", () => state);
  ipcMain.handle("state:setBaseUrl", async (_event, baseUrl: string) => {
    state.baseUrl = normalizeBaseUrl(baseUrl);
    await saveState(state);
  });

  ipcMain.handle(
    "manifest:load",
    async (_event, slug: string, baseUrl?: string) => {
      let normalizedBaseUrl: string;
      try {
        normalizedBaseUrl = normalizeBaseUrl(baseUrl ?? state.baseUrl);
      } catch (error) {
        return { ok: false, error: String(error) } satisfies LoadManifestResult;
      }
      const result = await fetchManifest(normalizedBaseUrl, slug);
      if (!result.ok || !result.manifest) return result;
      const fingerprint = manifestFingerprint(result.manifest);
      const signature = verifyManifestSignature(result.manifest);
      if (signature.present && !signature.valid) {
        return {
          ok: false,
          error: "La signature Ed25519 du manifeste est invalide.",
          signature,
        } satisfies LoadManifestResult;
      }
      const signerTrustId = signature.signerId
        ? `${normalizedBaseUrl}#${result.manifest.id}#${signature.signerId}`
        : undefined;
      if (
        state.trustedManifestFingerprints.includes(fingerprint) ||
        (signerTrustId && state.trustedManifestSigners.includes(signerTrustId))
      ) {
        return activateManifest(result.manifest, normalizedBaseUrl);
      }
      pendingManifest = {
        manifest: result.manifest,
        baseUrl: normalizedBaseUrl,
        fingerprint,
        signerTrustId,
      };
      return {
        ok: true,
        manifest: result.manifest,
        fingerprint,
        trusted: false,
        signature,
      } satisfies LoadManifestResult;
    },
  );

  ipcMain.handle("manifest:trust", async (_event, fingerprint: string) => {
    if (!pendingManifest || pendingManifest.fingerprint !== fingerprint) {
      return {
        ok: false,
        error: "Demande de confiance expirée.",
      } satisfies LoadManifestResult;
    }
    state.trustedManifestFingerprints = [
      ...state.trustedManifestFingerprints.filter(
        (trusted) => trusted !== fingerprint,
      ),
      fingerprint,
    ].slice(-100);
    if (pendingManifest.signerTrustId) {
      const signerTrustId = pendingManifest.signerTrustId;
      state.trustedManifestSigners = [
        ...state.trustedManifestSigners.filter(
          (trusted) => trusted !== signerTrustId,
        ),
        signerTrustId,
      ].slice(-100);
    }
    return activateManifest(pendingManifest.manifest, pendingManifest.baseUrl);
  });

  ipcMain.handle("launchers:remove", async (_event, id: string) => {
    const removed = state.launchers.find((launcher) => launcher.id === id);
    state.launchers = state.launchers.filter((launcher) => launcher.id !== id);
    if (
      removed &&
      currentManifest?.id === removed.slug &&
      currentManifestBaseUrl === removed.baseUrl
    ) {
      state.slug = null;
      currentManifest = null;
      currentManifestBaseUrl = null;
    }
    await saveState(state);
    return state.launchers;
  });

  ipcMain.handle("auth:microsoft", async () => {
    const revision = ++authRevision;
    emitLog("[auth] Ouverture de la connexion Microsoft dans le navigateur système.");
    const result = await loginMicrosoft((stage) =>
      emitLog(`[auth] Microsoft : ${stage}`),
    );
    if (revision !== authRevision) {
      return { ok: false, error: "Connexion Microsoft annulée." };
    }
    if (result.ok && result.account) {
      state.account = result.account;
      await saveState(state);
      emitAccountState();
      emitLog(`[auth] Compte Microsoft connecté : ${result.account.username}`);
    } else {
      emitLog(`[auth] ${result.error ?? "Connexion Microsoft refusée."}`);
    }
    return result;
  });
  ipcMain.handle("auth:microsoft:cancel", () => cancelMicrosoftLogin());
  ipcMain.handle("auth:offline", async (_event, username: string) => {
    ++authRevision;
    try {
      await clearMicrosoftSession();
    } catch {
      return {
        ok: false,
        error:
          "Impossible de supprimer la session Microsoft chiffrée. Redémarre l'application puis réessaie.",
      };
    }
    const result = setOfflineAccount(username);
    if (result.ok && result.account) {
      state.account = result.account;
      await saveState(state);
      emitAccountState();
    }
    return result;
  });
  ipcMain.handle("auth:logout", async () => {
    ++authRevision;
    await clearMicrosoftSession();
    clearAuth();
    state.account = null;
    await saveState(state);
    emitAccountState();
  });

  // URL volontairement fixe : le renderer ne peut choisir ni origine ni chemin.
  ipcMain.handle("admin:openCenter", () =>
    shell.openExternal(assertFixedAdminCenterUrl(ADMIN_CENTER_URL)),
  );

  ipcMain.handle("game:status", async () =>
    currentManifest && currentManifestBaseUrl
      ? getInstanceStatus(currentManifest, currentManifestBaseUrl)
      : "first-install",
  );
  ipcMain.handle("game:launch", async () => {
    if (!currentManifest || !currentManifestBaseUrl) {
      return { ok: false, error: "Aucun launcher chargé." };
    }
    const manifest = currentManifest;
    const manifestBaseUrl = currentManifestBaseUrl;
    if (busyOperation) {
      return { ok: false, error: "Une opération est déjà en cours." };
    }
    busyOperation = "launch";
    lastError = null;
    try {
      if (!state.account) {
        return {
          ok: false,
          error: "Aucun compte connecté.",
          diagnostic: {
            title: "Connexion requise",
            message:
              "Connecte un compte Microsoft ou hors-ligne avant de lancer le jeu.",
          },
        };
      }
      let account = state.account;
      if (account.type === "microsoft") {
        const revision = authRevision;
        const expectedUuid = account.uuid;
        const refreshed = await ensureMicrosoftAuthorizationFresh(
          (stage) => emitLog(`[auth] Microsoft : ${stage}`),
          () =>
            revision === authRevision &&
            state.account?.type === "microsoft" &&
            state.account.uuid === expectedUuid,
        );
        if (!refreshed.ok || !refreshed.account) {
          const message =
            refreshed.error ??
            "La session Microsoft doit être renouvelée avant le lancement.";
          return {
            ok: false,
            error: message,
            diagnostic: { title: "Reconnexion Microsoft requise", message },
          };
        }
        account = refreshed.account;
        state.account = account;
        await saveState(state);
        emitAccountState();
      }
      const assertAuthorizationMatchesAccount = () => {
        if (
          state.account?.type !== account.type ||
          state.account.uuid !== account.uuid ||
          state.account.username !== account.username ||
          !authorizationMatchesAccount(getCurrentAuth(), account)
        ) {
          throw new Error(
            "AUTH_SESSION_MISMATCH: le compte actif et le jeton de jeu ne correspondent plus. Déconnecte-toi puis reconnecte-toi.",
          );
        }
      };
      const verifyAccess = async (label: string) => {
        assertAuthorizationMatchesAccount();
        emitProgress({ phase: "manifest", label, percent: null });
        const access = await checkLauncherAccess(
          manifestBaseUrl,
          manifest.id,
          account,
        );
        if (!access.allowed) throw new LauncherAccessPolicyError(access);
        assertAuthorizationMatchesAccount();
      };
      await verifyAccess("Vérification de ton autorisation…");
      await launchGame(
        manifest,
        manifestBaseUrl,
        state.settings,
        emitProgress,
        emitLog,
        () => verifyAccess("Contrôle final de ton autorisation…"),
      );
      if (state.settings.closeOnLaunch) {
        setTimeout(() => mainWindow?.close(), 250);
      } else if (state.settings.minimizeOnLaunch) {
        setTimeout(() => mainWindow?.minimize(), 250);
      }
      return { ok: true };
    } catch (error) {
      if (error instanceof LauncherAccessPolicyError) {
        lastError = `${error.code}: ${error.message}`;
        emitLog(`ACCÈS REFUSÉ [${error.code}] : ${error.message}`);
        const diagnostic = {
          title: error.unavailable
            ? "Autorisation invérifiable"
            : "Accès au launcher refusé",
          message: error.message,
        };
        emitProgress({
          phase: "error",
          label: diagnostic.title,
          percent: null,
        });
        return { ok: false, error: error.message, diagnostic };
      }
      const message = error instanceof Error ? error.message : String(error);
      lastError = message;
      emitLog(`ERREUR : ${message}`);
      const diagnostic = classifyError(message);
      emitProgress({
        phase: "error",
        label: diagnostic.title,
        percent: null,
      });
      return { ok: false, error: message, diagnostic };
    } finally {
      busyOperation = null;
    }
  });
  ipcMain.handle("game:repair", async () => {
    if (!currentManifest || !currentManifestBaseUrl) {
      return { ok: false, error: "Aucun launcher chargé." };
    }
    if (busyOperation) {
      return { ok: false, error: "Une opération est déjà en cours." };
    }
    busyOperation = "repair";
    try {
      await repairInstance(
        currentManifestBaseUrl,
        currentManifest.id,
        emitProgress,
        emitLog,
      );
      return { ok: true };
    } catch (error) {
      return { ok: false, error: String(error) };
    } finally {
      busyOperation = null;
    }
  });

  ipcMain.handle("system:info", () => getSystemInfo());
  ipcMain.handle("diag:report", () =>
    buildReport({
      slug: state.slug,
      manifestSummary: currentManifest
        ? `${currentManifest.minecraft.version} / ${currentManifest.minecraft.loader} / ${currentManifest.mods.length} mods`
        : undefined,
      settingsSummary: `RAM ${state.settings.ramMb} Mo (${state.settings.ramMode}), ${state.settings.resolution}`,
      lastError: lastError ?? undefined,
      logTail: logBuffer,
    }),
  );
  ipcMain.handle("intro:seen", async () => {
    state.seenIntro = true;
    await saveState(state);
  });
  ipcMain.handle("server:status", (_event, address: string, port?: number) =>
    fetchServerStatus(address, port),
  );
  ipcMain.handle("settings:get", () => state.settings);
  ipcMain.handle(
    "settings:set",
    async (
      _event,
      key: keyof LauncherSettings,
      value: LauncherSettings[keyof LauncherSettings],
    ) => {
      if (!(key in state.settings)) throw new Error("Réglage inconnu.");
      state.settings = sanitizeSettings({ ...state.settings, [key]: value });
      await saveState(state);
    },
  );

  ipcMain.handle(
    "update:getState",
    () =>
      autoUpdates?.getState() ?? {
        status: "disabled",
        version: app.getVersion(),
        message: "Le service de mise à jour n'est pas encore initialisé.",
      },
  );
  ipcMain.handle(
    "update:check",
    () =>
      autoUpdates?.check().then((result) => result) ??
      Promise.resolve({
        ok: false,
        state: { status: "disabled", version: app.getVersion() } as const,
        error: "Le service de mise à jour n'est pas encore initialisé.",
      }),
  );
  ipcMain.handle("update:install", () => {
    if (busyOperation) {
      const state = autoUpdates?.getState() ?? {
        status: "disabled" as const,
        version: app.getVersion(),
      };
      return {
        ok: false,
        state,
        error:
          "Ferme le jeu ou attends la fin de l'opération avant d'installer.",
      };
    }
    return (
      autoUpdates?.install() ?? {
        ok: false,
        state: { status: "disabled" as const, version: app.getVersion() },
        error: "Le service de mise à jour n'est pas encore initialisé.",
      }
    );
  });

  ipcMain.on("win:minimize", () => mainWindow?.minimize());
  ipcMain.on("win:close", () => mainWindow?.close());
  ipcMain.on("win:toggleFullscreen", () => {
    if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  void app.whenReady().then(async () => {
  state = await loadState();
  const shouldRestoreMicrosoft = state.account?.type === "microsoft";
  if (state.account?.type === "offline") {
    rehydrateOffline(state.account);
  } else {
    // Les métadonnées persistées ne sont jamais exposées comme une session
    // active avant validation silencieuse du cache MSAL chiffré.
    state.account = null;
  }
  registerIpc();
  createWindow();
  autoUpdates = setupAutoUpdates(() => mainWindow);
  if (shouldRestoreMicrosoft) {
    const revision = authRevision;
    void restoreMicrosoftAccount(
      (stage) => emitLog(`[auth] Microsoft : ${stage}`),
      () => revision === authRevision,
    ).then(async (result) => {
      if (revision !== authRevision) return;
      if (result.ok && result.account) {
        state.account = result.account;
        emitLog(
          `[auth] Session Microsoft restaurée : ${result.account.username}`,
        );
      } else {
        state.account = null;
        emitLog(
          `[auth] Session Microsoft non restaurée : ${result.error ?? "reconnexion requise"}`,
        );
      }
      await saveState(state);
      emitAccountState();
    });
  }
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  cancelMicrosoftLogin();
  autoUpdates?.dispose();
  autoUpdates = null;
});
