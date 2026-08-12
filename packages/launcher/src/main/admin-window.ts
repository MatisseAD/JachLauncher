import { BrowserWindow, shell, type Event as ElectronEvent } from "electron";
import { ADMIN_CENTER_URL } from "./external-links";
import {
  adminLoadErrorHtml,
  isAllowedAdminNavigation,
} from "./admin-window-policy";

let adminWindow: BrowserWindow | null = null;

const ADMIN_ERROR_PAGE_URL = `data:text/html;charset=utf-8,${encodeURIComponent(
  adminLoadErrorHtml(),
)}`;

async function showAdminLoadError(window: BrowserWindow): Promise<void> {
  if (window.isDestroyed()) return;
  await window.loadURL(ADMIN_ERROR_PAGE_URL).catch(() => {});
  if (!window.isDestroyed()) window.show();
}

function openAllowedExternal(value: string): void {
  try {
    const url = new URL(value);
    if (url.protocol === "https:") void shell.openExternal(url.toString());
  } catch {
    // URL malformée : aucune navigation et aucun appel système.
  }
}

/**
 * Dedicated admin application window. It deliberately has no preload, no Node
 * bridge and no privileged secret; authentication remains the site's httpOnly
 * session cookie inside an isolated persistent Electron partition.
 */
export function openAdminWindow(): void {
  if (adminWindow && !adminWindow.isDestroyed()) {
    if (adminWindow.isMinimized()) adminWindow.restore();
    adminWindow.show();
    adminWindow.focus();
    return;
  }

  adminWindow = new BrowserWindow({
    width: 1320,
    height: 820,
    minWidth: 940,
    minHeight: 620,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: "#0b0c11",
    title: "YourLauncher Admin",
    webPreferences: {
      partition: "persist:yourlauncher-admin",
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  const webContents = adminWindow.webContents;
  webContents.session.setPermissionCheckHandler(() => false);
  webContents.session.setPermissionRequestHandler(
    (_contents, _permission, callback) => {
      callback(false);
    },
  );
  webContents.on("will-attach-webview", (event) => event.preventDefault());
  webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedAdminNavigation(url)) {
      void adminWindow?.loadURL(url);
      return { action: "deny" };
    }
    openAllowedExternal(url);
    return { action: "deny" };
  });
  webContents.on("will-navigate", (event, url) => {
    if (url === ADMIN_ERROR_PAGE_URL) return;
    if (!isAllowedAdminNavigation(url)) {
      event.preventDefault();
      openAllowedExternal(url);
    }
  });
  webContents.on("will-redirect", (event, url) => {
    if (!isAllowedAdminNavigation(url)) {
      event.preventDefault();
      openAllowedExternal(url);
    }
  });
  const blockDownload = (event: ElectronEvent) => event.preventDefault();
  webContents.session.on("will-download", blockDownload);
  webContents.on(
    "did-fail-load",
    (_event, errorCode, _description, validatedUrl, isMainFrame) => {
      if (
        isMainFrame &&
        errorCode !== -3 &&
        isAllowedAdminNavigation(validatedUrl)
      ) {
        const target = adminWindow;
        if (target) void showAdminLoadError(target);
      }
    },
  );

  adminWindow.once("ready-to-show", () => adminWindow?.show());
  adminWindow.once("closed", () => {
    webContents.session.removeListener("will-download", blockDownload);
    adminWindow = null;
  });
  void adminWindow
    .loadURL(ADMIN_CENTER_URL)
    .catch(() =>
      adminWindow ? showAdminLoadError(adminWindow) : Promise.resolve(),
    );
}
