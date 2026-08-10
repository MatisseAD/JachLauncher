import { app, type BrowserWindow } from "electron";
import electronUpdater, {
  type AppUpdater,
  type ProgressInfo,
  type UpdateDownloadedEvent,
  type UpdateInfo,
} from "electron-updater";
import log from "electron-log/main";
import type {
  DesktopUpdateActionResult,
  DesktopUpdateState,
} from "../shared-types/ipc";
import {
  describeUpdaterError,
  validDesktopVersion,
  validateUpdateFeedUrl,
  WINDOWS_UPDATE_FEED_URL,
} from "./update-contract";

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
const FIRST_CHECK_DELAY_MS = 8_000;

export interface AutoUpdateController {
  getState(): DesktopUpdateState;
  check(): Promise<DesktopUpdateActionResult>;
  install(): DesktopUpdateActionResult;
  dispose(): void;
}

function getAutoUpdater(): AppUpdater {
  // electron-updater est CommonJS ; cet accès reste compatible avec le bundle
  // ESM généré par electron-vite.
  return electronUpdater.autoUpdater;
}

function updateVersion(
  info: UpdateInfo | UpdateDownloadedEvent,
): string | null {
  return validDesktopVersion(info.version);
}

function disabledController(message: string): AutoUpdateController {
  const state: DesktopUpdateState = {
    status: "disabled",
    version: app.getVersion(),
    message,
  };
  return {
    getState: () => state,
    check: async () => ({ ok: false, state, error: message }),
    install: () => ({ ok: false, state, error: message }),
    dispose: () => {},
  };
}

/**
 * Active le canal stable Windows. Les binaires sont téléchargés en fond,
 * installés à la fermeture ou immédiatement sur demande explicite.
 */
export function setupAutoUpdates(
  getWindow: () => BrowserWindow | null,
): AutoUpdateController {
  if (!app.isPackaged || process.platform !== "win32") {
    return disabledController(
      "Les mises à jour automatiques sont actives dans la version Windows installée.",
    );
  }

  const updater = getAutoUpdater();
  const feedUrl = validateUpdateFeedUrl(WINDOWS_UPDATE_FEED_URL);
  updater.logger = log;
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.autoRunAppAfterInstall = true;
  updater.disableWebInstaller = true;
  updater.allowDowngrade = false;
  updater.setFeedURL({ provider: "generic", url: feedUrl, channel: "latest" });

  log.initialize();
  log.transports.file.level = "info";
  log.info(
    `[updater] Canal stable initialisé (${feedUrl}, version ${app.getVersion()})`,
  );

  let state: DesktopUpdateState = {
    status: "idle",
    version: app.getVersion(),
  };
  let disposed = false;
  let checkPromise: Promise<DesktopUpdateActionResult> | null = null;

  const send = (next: DesktopUpdateState) => {
    state = next;
    const window = getWindow();
    if (
      !disposed &&
      window &&
      !window.isDestroyed() &&
      !window.webContents.isDestroyed()
    ) {
      window.webContents.send("update:state", next);
    }
  };

  const fail = (error: unknown): DesktopUpdateState => {
    const message = describeUpdaterError(error);
    log.error("[updater] Échec", error);
    const next = { status: "error", message } satisfies DesktopUpdateState;
    send(next);
    return next;
  };

  const onChecking = () => send({ status: "checking" });
  const onAvailable = (info: UpdateInfo) => {
    const version = updateVersion(info);
    if (!version) {
      fail(new Error("Version invalide dans latest.yml"));
      return;
    }
    log.info(`[updater] Version ${version} disponible`);
    send({ status: "available", version });
  };
  const onNotAvailable = (info: UpdateInfo) => {
    const remoteVersion = updateVersion(info) ?? "inconnue";
    const currentVersion = app.getVersion();
    log.info(
      `[updater] Aucun update (locale ${currentVersion}, canal ${remoteVersion})`,
    );
    send({ status: "idle", version: currentVersion });
  };
  const onProgress = (progress: ProgressInfo) => {
    const percent = Number.isFinite(progress.percent)
      ? Math.max(0, Math.min(100, Math.round(progress.percent)))
      : 0;
    send({
      status: "downloading",
      percent,
      transferred: Math.max(0, progress.transferred),
      total: Math.max(0, progress.total),
    });
  };
  const onDownloaded = (info: UpdateDownloadedEvent) => {
    const version = updateVersion(info);
    if (!version) {
      fail(new Error("Version invalide dans latest.yml"));
      return;
    }
    log.info(`[updater] Version ${version} prête à installer`);
    send({ status: "ready", version });
  };
  const onError = (error: Error) => {
    fail(error);
  };
  const onCancelled = (info: UpdateInfo) => {
    const version = updateVersion(info) ?? undefined;
    log.warn(`[updater] Téléchargement ${version ?? ""} annulé`);
    send({
      status: "error",
      version,
      message:
        "Le téléchargement de la mise à jour a été annulé. Relance la vérification.",
    });
  };

  updater.on("checking-for-update", onChecking);
  updater.on("update-available", onAvailable);
  updater.on("update-not-available", onNotAvailable);
  updater.on("download-progress", onProgress);
  updater.on("update-downloaded", onDownloaded);
  updater.on("update-cancelled", onCancelled);
  updater.on("error", onError);

  const check = (): Promise<DesktopUpdateActionResult> => {
    if (disposed) {
      return Promise.resolve({
        ok: false,
        state,
        error: "Le service de mise à jour est arrêté.",
      });
    }
    if (state.status === "ready" || state.status === "downloading") {
      return Promise.resolve({ ok: true, state });
    }
    if (checkPromise) return checkPromise;

    send({ status: "checking" });
    log.info("[updater] Vérification du canal stable");
    checkPromise = updater
      .checkForUpdates()
      .then(() => ({ ok: state.status !== "error", state }))
      .catch((error: unknown) => {
        const failedState = fail(error);
        return {
          ok: false,
          state: failedState,
          error: failedState.message,
        };
      })
      .finally(() => {
        checkPromise = null;
      });
    return checkPromise;
  };

  const firstCheck = setTimeout(() => void check(), FIRST_CHECK_DELAY_MS);
  const recurringCheck = setInterval(() => void check(), CHECK_INTERVAL_MS);

  return {
    getState: () => ({ ...state }),
    check,
    install: () => {
      if (state.status !== "ready") {
        const error = "Aucune mise à jour téléchargée n'est prête.";
        return { ok: false, state: { ...state }, error };
      }
      log.info(`[updater] Installation immédiate de ${state.version}`);
      // L'IPC doit pouvoir rendre sa réponse avant la fermeture des fenêtres.
      setImmediate(() => updater.quitAndInstall(true, true));
      return { ok: true, state: { ...state } };
    },
    dispose: () => {
      if (disposed) return;
      disposed = true;
      clearTimeout(firstCheck);
      clearInterval(recurringCheck);
      updater.removeListener("checking-for-update", onChecking);
      updater.removeListener("update-available", onAvailable);
      updater.removeListener("update-not-available", onNotAvailable);
      updater.removeListener("download-progress", onProgress);
      updater.removeListener("update-downloaded", onDownloaded);
      updater.removeListener("update-cancelled", onCancelled);
      updater.removeListener("error", onError);
    },
  };
}
