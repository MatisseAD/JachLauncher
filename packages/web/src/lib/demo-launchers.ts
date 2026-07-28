import {
  LauncherManifestSchema,
  MANIFEST_SCHEMA_VERSION,
  type LauncherManifest,
} from "@jach/shared";
import { DEFAULT_FORM, type LauncherFormData } from "./launcher-types";

function demo(
  slug: string,
  title: string,
  overrides: Partial<LauncherFormData>,
): LauncherFormData {
  return {
    ...DEFAULT_FORM,
    slug,
    title,
    status: "published",
    description: "Launcher de démonstration YourLauncher.",
    news: [],
    events: [],
    patchNotes: [],
    mods: [],
    resourcepacks: [],
    shaderpacks: [],
    jvmArgs: [],
    maintenance: { active: false },
    alert: { active: false, kind: "info", message: "" },
    ...overrides,
  };
}

export const DEMO_LAUNCHERS: LauncherFormData[] = [
  demo("serveur-demo", "YourLauncher Demo", {
    description:
      "Une démonstration complète et interactive du launcher universel.",
    primaryColor: "#8b5cf6",
    secondaryColor: "#c4b5fd",
    visualStyle: "premium",
    ambiance: "stars",
    backgroundUrl: "/examples/yourlauncher-demo.svg",
    playButtonLabel: "REJOINDRE LA DÉMO",
    preLaunchMessage: "Tout est prêt : connecte-toi pour commencer.",
    news: [
      {
        id: "welcome",
        title: "Bienvenue sur la démo interactive",
        description:
          "Explore les actualités, les profils, les réglages et le parcours joueur.",
        date: "2026-07-29",
        category: "community",
        isNew: true,
      },
    ],
    events: [
      {
        id: "discovery",
        title: "Soirée découverte",
        description: "Découvre l’expérience complète avec la communauté.",
        startsAt: "2026-08-01T20:00:00.000Z",
      },
    ],
    patchNotes: [
      {
        id: "demo-1",
        version: "1.0.0",
        date: "2026-07-29",
        lines: [
          "Aperçu à taille réelle",
          "Personnalisation avancée du fond",
          "Parcours joueur guidé",
        ],
      },
    ],
  }),
  demo("nova-survival", "Nova Survival", {
    description:
      "Un monde survie communautaire lumineux, moderne et accueillant.",
    primaryColor: "#8b5cf6",
    secondaryColor: "#fb7185",
    visualStyle: "premium",
    ambiance: "stars",
    backgroundUrl: "/examples/nova-survival.svg",
    mcVersion: "1.21.8",
    loader: "fabric",
    launcherType: "survival",
    playButtonLabel: "JOUER À NOVA",
    backgroundOverlay: 35,
    panelOpacity: 66,
    news: [
      {
        id: "season-4",
        title: "La saison 4 commence",
        description:
          "Nouvelle carte, économie revue et défis coopératifs inédits.",
        date: "2026-07-29",
        category: "update",
        isNew: true,
      },
      {
        id: "community-build",
        title: "Concours de construction",
        description: "Construis la meilleure base céleste et gagne un grade.",
        date: "2026-07-25",
        category: "event",
      },
    ],
  }),
  demo("elyria-origins", "Elyria Origins", {
    description: "Une aventure modée dans un univers naturel et mystérieux.",
    primaryColor: "#10b981",
    secondaryColor: "#fbbf24",
    visualStyle: "medieval",
    ambiance: "rain",
    backgroundUrl: "/examples/elyria-origins.svg",
    mcVersion: "1.20.1",
    loader: "forge",
    launcherType: "modded",
    logoShape: "circle",
    sidebarStyle: "solid",
    fontFamily: "serif",
    playButtonLabel: "ENTRER EN ELYRIA",
    news: [
      {
        id: "origins",
        title: "Choisis ton origine",
        description:
          "Huit peuples jouables transforment désormais ta progression.",
        date: "2026-07-27",
        category: "update",
        isNew: true,
      },
    ],
    patchNotes: [
      {
        id: "elyria-28",
        version: "2.8.0",
        date: "2026-07-27",
        lines: [
          "Ajout de deux nouvelles origines",
          "Nouveau donjon sylvestre",
          "Amélioration des performances",
        ],
      },
    ],
  }),
  demo("block-district", "Block District", {
    description: "Mini-jeux rapides, compétitifs et immédiatement accessibles.",
    primaryColor: "#2563eb",
    secondaryColor: "#22d3ee",
    visualStyle: "futuristic",
    ambiance: "glitch",
    backgroundUrl: "/examples/block-district.svg",
    mcVersion: "1.21.5",
    loader: "vanilla",
    launcherType: "minigames",
    menuPlacement: "top",
    cardShape: "sharp",
    cornerRadius: 4,
    contentDensity: "compact",
    playButtonLabel: "LANCER UNE PARTIE",
    news: [
      {
        id: "ranked",
        title: "Mode classé en préparation",
        description: "Les premières arènes compétitives arrivent très bientôt.",
        date: "2026-07-29",
        category: "community",
        isNew: true,
      },
    ],
    alert: {
      active: true,
      kind: "info",
      message:
        "Version de démonstration — découvre l’interface en avant-première.",
    },
  }),
];

export function getDemoLauncher(slug: string): LauncherFormData | undefined {
  return DEMO_LAUNCHERS.find((launcher) => launcher.slug === slug);
}

export function buildDemoManifest(
  data: LauncherFormData,
  origin: string,
): LauncherManifest {
  const absolute = (value?: string | null) =>
    value
      ? /^https?:\/\//i.test(value)
        ? value
        : `${origin}${value.startsWith("/") ? "" : "/"}${value}`
      : undefined;

  return LauncherManifestSchema.parse({
    schemaVersion: MANIFEST_SCHEMA_VERSION,
    id: data.slug,
    updatedAt: "2026-07-29T00:00:00.000Z",
    launcherType: data.launcherType,
    preLaunchMessage: data.preLaunchMessage,
    branding: {
      title: data.title,
      description: data.description,
      logoUrl: absolute(data.logoUrl),
      backgroundUrl: absolute(data.backgroundUrl),
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      textColor: data.textColor,
      theme: data.theme,
      visualStyle: data.visualStyle,
      buttonStyle: data.buttonStyle,
      cardShape: data.cardShape,
      menuPlacement: data.menuPlacement,
      backgroundFit: data.backgroundFit,
      backgroundPosition: data.backgroundPosition,
      backgroundOverlay: data.backgroundOverlay,
      backgroundBlur: data.backgroundBlur,
      panelOpacity: data.panelOpacity,
      fontFamily: data.fontFamily,
      cornerRadius: data.cornerRadius,
      contentDensity: data.contentDensity,
      sidebarStyle: data.sidebarStyle,
      logoShape: data.logoShape,
      playButtonLabel: data.playButtonLabel,
      showServerStatus: data.showServerStatus,
      showNews: data.showNews,
      showDiscord: data.showDiscord,
      showWebsite: data.showWebsite,
      discordUrl: data.discordUrl ?? undefined,
      websiteUrl: data.websiteUrl ?? undefined,
      supportUrl: data.supportUrl ?? undefined,
      ambiance: data.ambiance,
    },
    minecraft: {
      version: data.mcVersion,
      loader: data.loader,
      loaderVersion: data.loaderVersion ?? undefined,
      javaMajor: data.javaMajor ?? undefined,
    },
    server: {
      address: data.serverAddress ?? undefined,
      port: data.serverPort ?? undefined,
    },
    memory: { min: data.memMin, max: data.memMax },
    mods: data.mods,
    resourcepacks: data.resourcepacks,
    shaderpacks: data.shaderpacks,
    news: data.news,
    events: data.events,
    patchNotes: data.patchNotes,
    maintenance: data.maintenance,
    alert: data.alert,
    jvmArgs: data.jvmArgs,
  });
}
