import type {
  DownloadableFile,
  NewsEntry,
  EventEntry,
  PatchNote,
  Maintenance,
  Alert,
  Ambiance,
  ModLoader,
  VisualStyle,
  LauncherType,
  LauncherStatus,
} from "@jach/shared";

export type Theme = "dark" | "light";
export type ButtonStyle = "glow" | "flat" | "pixel" | "outline";
export type CardShape = "rounded" | "sharp" | "pill";
export type MenuPlacement = "left" | "top";

/** État complet du formulaire d'édition, partagé éditeur <-> prévisualisation. */
export interface LauncherFormData {
  id?: string;
  slug: string;
  title: string;
  description: string;
  status: LauncherStatus;
  favorite: boolean;

  // Apparence
  logoUrl?: string | null;
  backgroundUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  textColor: string;
  theme: Theme;
  visualStyle: VisualStyle;
  buttonStyle: ButtonStyle;
  cardShape: CardShape;
  menuPlacement: MenuPlacement;
  showNews: boolean;
  showDiscord: boolean;
  showWebsite: boolean;
  discordUrl?: string | null;
  websiteUrl?: string | null;
  supportUrl?: string | null;
  ambiance: Ambiance;

  // Minecraft
  mcVersion: string;
  loader: ModLoader;
  loaderVersion?: string | null;
  javaMajor?: number | null;
  launcherType: LauncherType;
  serverAddress?: string | null;
  serverPort?: number | null;
  preLaunchMessage: string;
  memMin: number;
  memMax: number;

  // Contenu
  mods: DownloadableFile[];
  resourcepacks: DownloadableFile[];
  shaderpacks: DownloadableFile[];
  news: NewsEntry[];
  events: EventEntry[];
  patchNotes: PatchNote[];
  maintenance: Maintenance;
  alert: Alert;
  jvmArgs: string[];
}

export const DEFAULT_FORM: LauncherFormData = {
  slug: "",
  title: "",
  description: "",
  status: "draft",
  favorite: false,
  primaryColor: "#8b5cf6",
  secondaryColor: "#c4b5fd",
  textColor: "#ece8f7",
  theme: "dark",
  visualStyle: "premium",
  buttonStyle: "glow",
  cardShape: "rounded",
  menuPlacement: "left",
  showNews: true,
  showDiscord: false,
  showWebsite: false,
  ambiance: "none",
  mcVersion: "1.20.1",
  loader: "fabric",
  launcherType: "vanilla",
  preLaunchMessage: "",
  memMin: 2048,
  memMax: 4096,
  mods: [],
  resourcepacks: [],
  shaderpacks: [],
  news: [],
  events: [],
  patchNotes: [],
  maintenance: { active: false },
  alert: { active: false, kind: "info", message: "" },
  jvmArgs: [],
};

export function emptyMod(): DownloadableFile {
  return {
    id: crypto.randomUUID(),
    name: "",
    fileName: "",
    url: "",
    sha256: "",
    size: 0,
    source: "direct",
    required: true,
  };
}

export function emptyNews(): NewsEntry {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
  };
}

export function emptyEvent(): EventEntry {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
    startsAt: "",
  };
}

export function emptyPatchNote(): PatchNote {
  return {
    id: crypto.randomUUID(),
    version: "",
    date: new Date().toISOString().slice(0, 10),
    lines: [],
  };
}
