import type {
  NewsEntry,
  VisualStyle,
  Ambiance,
  EventEntry,
  PatchNote,
  Maintenance,
  Alert,
} from "@jach/shared";

export type TabId =
  | "home"
  | "news"
  | "events"
  | "updates"
  | "profiles"
  | "mods"
  | "settings"
  | "help";

/** États du bouton Jouer / du pipeline de lancement. */
export type PlayState =
  | "ready"
  | "first-install"
  | "update"
  | "verifying"
  | "downloading"
  | "extracting"
  | "launching"
  | "running"
  | "offline"
  | "error";

export type ButtonStyle = "glow" | "flat" | "pixel" | "outline";
export type CardShape = "rounded" | "sharp" | "pill";
export type MenuPlacement = "left" | "top";
export type Theme = "dark" | "light";

/** Un lien externe affiché dans le launcher. */
export interface SkinLink {
  id: string;
  label: string;
  url: string;
  icon: string; // emoji
}

/** Un profil de jeu sélectionnable. */
export interface SkinProfile {
  id: string;
  name: string;
  mcVersion: string;
  loader: string;
  modCount: number;
  ramMb: number;
  status: "ready" | "update" | "unavailable";
}

/** Un mod listé dans la page Mods. */
export interface SkinMod {
  id: string;
  name: string;
  version?: string;
  size?: string;
  description?: string;
  iconUrl?: string;
  status: "installed" | "download" | "update" | "disabled" | "error";
}

/**
 * Configuration visuelle + contenu (dérivée du manifeste / formulaire).
 * C'est la partie "personnalisable depuis le site".
 */
export interface SkinConfig {
  title: string;
  logoUrl?: string;
  backgroundUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  theme: Theme;
  visualStyle: VisualStyle;
  buttonStyle: ButtonStyle;
  cardShape: CardShape;
  menuPlacement: MenuPlacement;
  showNews: boolean;
  mcVersion: string;
  loader: string;
  launcherType: string;
  preLaunchMessage?: string;
  /** Ambiance animée du fond. */
  ambiance: Ambiance;
  /** URL de support (bouton "J'ai un problème"). */
  supportUrl?: string;
  news: NewsEntry[];
  events: EventEntry[];
  patchNotes: PatchNote[];
  maintenance: Maintenance;
  alert: Alert;
  mods: SkinMod[];
  profiles: SkinProfile[];
  links: SkinLink[];
}

export interface SkinProgress {
  /** 0..100, ou null si indéterminé. */
  percent: number | null;
  label: string;
  file?: string;
  speed?: string;
  eta?: string;
}

export interface SkinAccount {
  username: string;
  type: "microsoft" | "offline";
  avatarUrl?: string;
}

export interface ServerStatus {
  online: boolean;
  players?: number;
  maxPlayers?: number;
  /** Version détectée du serveur (ex "1.21.1" / "Paper 1.21"). */
  version?: string;
  /** Message du jour (MOTD). */
  motd?: string;
  /** Latence en ms. */
  pingMs?: number;
  loading?: boolean;
}

export type RamMode = "auto" | "low" | "balanced" | "performance" | "custom";

/** Diagnostic d'erreur lisible présenté au joueur. */
export interface SkinDiagnostic {
  title: string;
  message: string;
}

/** Un launcher/serveur enregistré, affiché dans la page Profils. */
export interface SkinLauncherRef {
  id: string;
  title: string;
  logoUrl?: string;
  subtitle?: string;
  active?: boolean;
}

export interface SkinNotification {
  id: string;
  kind: "info" | "success" | "error";
  message: string;
}

export interface SkinSettings {
  ramMb: number;
  ramMode: RamMode;
  fullscreen: boolean;
  closeOnLaunch: boolean;
  minimizeOnLaunch: boolean;
  resolution: string;
}

/** État runtime (dynamique). */
export interface SkinState {
  activeTab: TabId;
  playState: PlayState;
  progress?: SkinProgress;
  account?: SkinAccount | null;
  server?: ServerStatus;
  notifications?: SkinNotification[];
  selectedProfileId?: string;
  loading?: boolean;
  /** Affiche les boutons de fenêtre (min/close). */
  windowControls?: boolean;
  settings?: SkinSettings;
  /** Texte des logs (page erreur / debug), optionnel. */
  logLines?: string[];
  /** Une réparation est en cours. */
  repairing?: boolean;
  /** Diagnostic d'erreur lisible (affiché en cas de playState "error"). */
  diagnostic?: SkinDiagnostic | null;
  /** Parcours de première installation à afficher. */
  firstRun?: boolean;
  /** RAM totale détectée du PC (Mo). */
  systemRamMb?: number;
  /** RAM recommandée pour ce PC (Mo). */
  recommendedRamMb?: number;
  /** Launchers/serveurs enregistrés (page Profils). */
  launchers?: SkinLauncherRef[];
}

/** Callbacks branchés par le consommateur (launcher = IPC, site = démo). */
export interface SkinHandlers {
  onTab?: (tab: TabId) => void;
  onPlay?: () => void;
  onLoginMicrosoft?: () => void;
  onLoginOffline?: (username: string) => void;
  onLogout?: () => void;
  onOpenLink?: (url: string) => void;
  onSelectProfile?: (id: string) => void;
  onMinimize?: () => void;
  onClose?: () => void;
  onToggleFullscreen?: () => void;
  onChangeSetting?: <K extends keyof SkinSettings>(key: K, value: SkinSettings[K]) => void;
  /** Lance la réparation du launcher. */
  onRepair?: () => void;
  /** Copie le rapport de diagnostic dans le presse-papiers. */
  onCopyReport?: () => void;
  /** Termine le parcours de première installation. */
  onFinishIntro?: () => void;
  /** Change le mode de RAM (auto/faible/équilibré/performance/perso). */
  onSelectRamMode?: (mode: RamMode) => void;
  /** Ouvre l'ajout d'un nouveau launcher (saisie d'un code). */
  onAddLauncher?: () => void;
  /** Bascule vers un launcher enregistré. */
  onSelectLauncher?: (id: string) => void;
  /** Retire un launcher enregistré. */
  onRemoveLauncher?: (id: string) => void;
}

export interface LauncherSkinProps {
  config: SkinConfig;
  state: SkinState;
  handlers?: SkinHandlers;
  /** Mode aperçu (site) : interactions visuelles seulement. */
  preview?: boolean;
}
