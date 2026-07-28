import type { LauncherManifest } from "@jach/shared";

/** Compte utilisé pour lancer le jeu. */
export interface Account {
  type: "microsoft" | "offline";
  username: string;
  uuid: string;
  /** Avatar (tête Minecraft) dérivé de l'UUID. */
  avatarUrl?: string;
}

export type RamMode = "auto" | "low" | "balanced" | "performance" | "custom";

/** Réglages persistants du launcher. */
export interface LauncherSettings {
  ramMb: number;
  ramMode: RamMode;
  fullscreen: boolean;
  closeOnLaunch: boolean;
  minimizeOnLaunch: boolean;
  resolution: string;
}

export const DEFAULT_SETTINGS: LauncherSettings = {
  ramMb: 4096,
  ramMode: "balanced",
  fullscreen: false,
  closeOnLaunch: false,
  minimizeOnLaunch: true,
  resolution: "1280x720",
};

/** Statut d'un serveur Minecraft. */
export interface ServerStatusResult {
  online: boolean;
  players?: number;
  maxPlayers?: number;
  version?: string;
  motd?: string;
  pingMs?: number;
}

/** Infos système (pour recommander la RAM). */
export interface SystemInfo {
  totalRamMb: number;
  recommendedRamMb: number;
}

/** Un launcher/serveur enregistré (pour pouvoir en changer). */
export interface SavedLauncher {
  /** Clé unique origine + slug. */
  id: string;
  slug: string;
  baseUrl: string;
  title: string;
  logoUrl?: string;
}

/** État persistant du launcher (settings.json dans userData). */
export interface LauncherState {
  baseUrl: string;
  slug: string | null;
  account: Account | null;
  settings: LauncherSettings;
  /** Le parcours de première installation a déjà été vu. */
  seenIntro: boolean;
  /** Launchers/serveurs enregistrés (changement à la volée). */
  launchers: SavedLauncher[];
  /** Empreintes de manifestes explicitement approuvées par le joueur. */
  trustedManifestFingerprints: string[];
  /** Signataires approuvés, liés à l'origine et au slug. */
  trustedManifestSigners: string[];
}

/** Étapes du cycle de lancement, pour l'UI. */
export type LaunchPhase =
  | "idle"
  | "manifest"
  | "java"
  | "downloading"
  | "extracting"
  | "launching"
  | "running"
  | "closed"
  | "error";

export interface LaunchProgress {
  phase: LaunchPhase;
  /** Texte lisible affiché à l'utilisateur. */
  label: string;
  /** 0..100, ou null si indéterminé. */
  percent: number | null;
}

export type DesktopUpdateStatus =
  "idle" | "checking" | "available" | "downloading" | "ready" | "error";

/** État du téléchargement de l'application elle-même. */
export interface DesktopUpdateState {
  status: DesktopUpdateStatus;
  version?: string;
  percent?: number;
  transferred?: number;
  total?: number;
  message?: string;
}

export interface LoadManifestResult {
  ok: boolean;
  manifest?: LauncherManifest;
  fingerprint?: string;
  trusted?: boolean;
  signature?: {
    present: boolean;
    valid: boolean;
    signerId?: string;
  };
  error?: string;
}

export type InstanceStatus = "first-install" | "update" | "ready";

export interface AuthResult {
  ok: boolean;
  account?: Account;
  error?: string;
}

/** Diagnostic lisible d'une erreur de lancement. */
export interface Diagnostic {
  title: string;
  message: string;
}

export interface LaunchResult {
  ok: boolean;
  error?: string;
  diagnostic?: Diagnostic;
}

/** API exposée au renderer via contextBridge (window.jach). */
export interface JachApi {
  getState(): Promise<LauncherState>;
  setBaseUrl(baseUrl: string): Promise<void>;
  loadManifest(slug: string, baseUrl?: string): Promise<LoadManifestResult>;
  trustManifest(fingerprint: string): Promise<LoadManifestResult>;
  instanceStatus(): Promise<InstanceStatus>;
  removeLauncher(slug: string): Promise<SavedLauncher[]>;
  loginMicrosoft(): Promise<AuthResult>;
  setOfflineAccount(username: string): Promise<AuthResult>;
  logout(): Promise<void>;
  launch(): Promise<LaunchResult>;
  repair(): Promise<{ ok: boolean; error?: string }>;
  serverStatus(address: string, port?: number): Promise<ServerStatusResult>;
  systemInfo(): Promise<SystemInfo>;
  getReport(): Promise<string>;
  markIntroSeen(): Promise<void>;
  getSettings(): Promise<LauncherSettings>;
  setSetting<K extends keyof LauncherSettings>(
    key: K,
    value: LauncherSettings[K],
  ): Promise<void>;
  minimize(): void;
  closeWindow(): void;
  toggleFullscreen(): void;
  onProgress(cb: (p: LaunchProgress) => void): () => void;
  onLog(cb: (line: string) => void): () => void;
  onUpdateState(cb: (state: DesktopUpdateState) => void): () => void;
}

declare global {
  interface Window {
    jach: JachApi;
  }
}
export const DEFAULT_BASE_URL = "https://yourlauncher.vercel.app";
