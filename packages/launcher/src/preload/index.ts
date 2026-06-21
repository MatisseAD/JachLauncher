import { contextBridge, ipcRenderer } from "electron";
import type {
  JachApi,
  LaunchProgress,
  LauncherState,
  LoadManifestResult,
  AuthResult,
  LauncherSettings,
  ServerStatusResult,
  SystemInfo,
  LaunchResult,
  SavedLauncher,
} from "../shared-types/ipc";

const api: JachApi = {
  getState: () => ipcRenderer.invoke("state:get") as Promise<LauncherState>,
  setBaseUrl: (baseUrl) => ipcRenderer.invoke("state:setBaseUrl", baseUrl) as Promise<void>,
  loadManifest: (slug, baseUrl) =>
    ipcRenderer.invoke("manifest:load", slug, baseUrl) as Promise<LoadManifestResult>,
  removeLauncher: (slug) =>
    ipcRenderer.invoke("launchers:remove", slug) as Promise<SavedLauncher[]>,
  loginMicrosoft: () => ipcRenderer.invoke("auth:microsoft") as Promise<AuthResult>,
  setOfflineAccount: (username) =>
    ipcRenderer.invoke("auth:offline", username) as Promise<AuthResult>,
  logout: () => ipcRenderer.invoke("auth:logout") as Promise<void>,
  launch: () => ipcRenderer.invoke("game:launch") as Promise<LaunchResult>,
  repair: () => ipcRenderer.invoke("game:repair") as Promise<{ ok: boolean; error?: string }>,

  serverStatus: (address, port) =>
    ipcRenderer.invoke("server:status", address, port) as Promise<ServerStatusResult>,
  systemInfo: () => ipcRenderer.invoke("system:info") as Promise<SystemInfo>,
  getReport: () => ipcRenderer.invoke("diag:report") as Promise<string>,
  markIntroSeen: () => ipcRenderer.invoke("intro:seen") as Promise<void>,
  getSettings: () => ipcRenderer.invoke("settings:get") as Promise<LauncherSettings>,
  setSetting: (key, value) =>
    ipcRenderer.invoke("settings:set", key, value) as Promise<void>,
  minimize: () => ipcRenderer.send("win:minimize"),
  closeWindow: () => ipcRenderer.send("win:close"),
  toggleFullscreen: () => ipcRenderer.send("win:toggleFullscreen"),

  onProgress: (cb: (p: LaunchProgress) => void) => {
    const listener = (_e: unknown, p: LaunchProgress) => cb(p);
    ipcRenderer.on("launch:progress", listener);
    return () => ipcRenderer.removeListener("launch:progress", listener);
  },
  onLog: (cb: (line: string) => void) => {
    const listener = (_e: unknown, line: string) => cb(line);
    ipcRenderer.on("launch:log", listener);
    return () => ipcRenderer.removeListener("launch:log", listener);
  },
};

contextBridge.exposeInMainWorld("jach", api);
