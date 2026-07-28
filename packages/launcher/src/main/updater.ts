import { app, type BrowserWindow } from "electron";
import electronUpdater, {
  type AppUpdater,
  type UpdateDownloadedEvent,
  type UpdateInfo,
} from "electron-updater";
import log from "electron-log/main";
import type { DesktopUpdateState } from "../shared-types/ipc";

const CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
const FIRST_CHECK_DELAY_MS = 8_000;

function getAutoUpdater(): AppUpdater {
  // electron-updater est un module CommonJS. La déstructuration conserve la
  // compatibilité avec le bundle ESM produit par electron-vite.
  return electronUpdater.autoUpdater;
}

function versionOf(info: UpdateInfo | UpdateDownloadedEvent): string {
  return info.version || "nouvelle version";
}

/**
 * Active les mises à jour silencieuses du client Windows.
 *
 * Une version est recherchée au démarrage puis toutes les quatre heures. Elle
 * est téléchargée en arrière-plan et installée automatiquement à la fermeture
 * de l'application, ce qui évite d'interrompre une installation ou une partie.
 */
export function setupAutoUpdates(
  getWindow: () => BrowserWindow | null,
): () => void {
  if (!app.isPackaged || process.platform !== "win32") return () => {};

  const updater = getAutoUpdater();
  updater.logger = log;
  updater.autoDownload = true;
  updater.autoInstallOnAppQuit = true;
  updater.autoRunAppAfterInstall = true;

  log.initialize();
  log.transports.file.level = "info";

  const send = (state: DesktopUpdateState) => {
    getWindow()?.webContents.send("update:state", state);
  };

  updater.on("checking-for-update", () => send({ status: "checking" }));
  updater.on("update-available", (info) =>
    send({ status: "available", version: versionOf(info) }),
  );
  updater.on("update-not-available", () =>
    send({ status: "idle", version: app.getVersion() }),
  );
  updater.on("download-progress", (progress) =>
    send({
      status: "downloading",
      percent: Math.round(progress.percent),
      transferred: progress.transferred,
      total: progress.total,
    }),
  );
  updater.on("update-downloaded", (info) =>
    send({ status: "ready", version: versionOf(info) }),
  );
  updater.on("error", (error) => {
    log.error("Échec de la mise à jour automatique", error);
    send({
      status: "error",
      message:
        "La vérification des mises à jour a échoué. Un nouvel essai sera lancé automatiquement.",
    });
  });

  const check = () => {
    void updater.checkForUpdates().catch((error) => {
      log.warn("Vérification de mise à jour impossible", error);
    });
  };

  const firstCheck = setTimeout(check, FIRST_CHECK_DELAY_MS);
  const recurringCheck = setInterval(check, CHECK_INTERVAL_MS);

  return () => {
    clearTimeout(firstCheck);
    clearInterval(recurringCheck);
  };
}
