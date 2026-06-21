import type { LauncherFormData } from "./launcher-types";

/** Un preset applique un sous-ensemble de champs d'apparence/config. */
export interface Preset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  apply: Partial<LauncherFormData>;
}

export const PRESETS: Preset[] = [
  {
    id: "premium-dark",
    name: "Premium violet",
    emoji: "💜",
    description: "Élégant, sombre, dégradé violet.",
    apply: {
      visualStyle: "premium",
      theme: "dark",
      primaryColor: "#8b5cf6",
      secondaryColor: "#c4b5fd",
      textColor: "#ece8f7",
      buttonStyle: "glow",
      cardShape: "rounded",
      menuPlacement: "left",
    },
  },
  {
    id: "survival",
    name: "Serveur survie",
    emoji: "🌳",
    description: "Tons nature, émeraude et bois.",
    apply: {
      visualStyle: "dark",
      theme: "dark",
      primaryColor: "#3ad07a",
      secondaryColor: "#a3e635",
      textColor: "#eafff0",
      buttonStyle: "glow",
      cardShape: "rounded",
      launcherType: "survival",
    },
  },
  {
    id: "faction",
    name: "Serveur faction",
    emoji: "⚔️",
    description: "Rouge intense, compétitif.",
    apply: {
      visualStyle: "dark",
      theme: "dark",
      primaryColor: "#ff5c63",
      secondaryColor: "#ffb547",
      textColor: "#fff0f0",
      buttonStyle: "flat",
      cardShape: "sharp",
      launcherType: "private",
    },
  },
  {
    id: "rp",
    name: "Serveur RP",
    emoji: "🎭",
    description: "Ambiance médiévale, or et pourpre.",
    apply: {
      visualStyle: "medieval",
      theme: "dark",
      primaryColor: "#c9a227",
      secondaryColor: "#9d4edd",
      textColor: "#fdf3d8",
      buttonStyle: "outline",
      cardShape: "rounded",
      launcherType: "rp",
    },
  },
  {
    id: "pixel-retro",
    name: "Pixel rétro",
    emoji: "🟩",
    description: "Style blocs, pixelisé, vif.",
    apply: {
      visualStyle: "pixel",
      theme: "dark",
      primaryColor: "#62c462",
      secondaryColor: "#ffd93b",
      textColor: "#ffffff",
      buttonStyle: "pixel",
      cardShape: "sharp",
    },
  },
  {
    id: "futuristic",
    name: "Futuriste",
    emoji: "🛸",
    description: "Néon cyan, ultra moderne.",
    apply: {
      visualStyle: "futuristic",
      theme: "dark",
      primaryColor: "#22d3ee",
      secondaryColor: "#a78bfa",
      textColor: "#eafdff",
      buttonStyle: "glow",
      cardShape: "pill",
      menuPlacement: "top",
    },
  },
];
