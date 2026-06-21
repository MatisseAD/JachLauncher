import { z } from "zod";

/**
 * Le "manifeste" est le contrat partagé entre le site (qui le génère) et le
 * launcher (qui le consomme). Le launcher télécharge ce JSON, applique le
 * branding au runtime, puis télécharge la bonne version de Minecraft, le mod
 * loader et les mods décrits ici avant de lancer le jeu.
 *
 * Toute évolution du format doit incrémenter MANIFEST_SCHEMA_VERSION.
 * Les nouveaux champs sont optionnels (avec valeur par défaut) afin de rester
 * rétro-compatibles.
 */
export const MANIFEST_SCHEMA_VERSION = 1;

/** Mod loaders supportés. "vanilla" = aucun loader. */
export const ModLoaderSchema = z.enum([
  "vanilla",
  "fabric",
  "forge",
  "quilt",
  "neoforge",
]);
export type ModLoader = z.infer<typeof ModLoaderSchema>;

/** Provenance d'un fichier téléchargeable. */
export const FileSourceSchema = z.enum(["direct", "modrinth", "curseforge"]);
export type FileSource = z.infer<typeof FileSourceSchema>;

/** Style visuel global du launcher (presets de thème). */
export const VisualStyleSchema = z.enum([
  "premium",
  "dark",
  "light",
  "pixel",
  "medieval",
  "futuristic",
]);
export type VisualStyle = z.infer<typeof VisualStyleSchema>;

/** Ambiance animée du fond (effets de particules selon l'univers). */
export const AmbianceSchema = z.enum([
  "none",
  "fire",
  "snow",
  "stars",
  "rain",
  "glitch",
]);
export type Ambiance = z.infer<typeof AmbianceSchema>;

/** Type de launcher / serveur, sert d'étiquette descriptive. */
export const LauncherTypeSchema = z.enum([
  "vanilla",
  "modded",
  "private",
  "minigames",
  "survival",
  "rp",
]);
export type LauncherType = z.infer<typeof LauncherTypeSchema>;

/** Statut de publication. */
export const LauncherStatusSchema = z.enum(["draft", "ready", "published"]);
export type LauncherStatus = z.infer<typeof LauncherStatusSchema>;

/** Couleur hex (#rgb ou #rrggbb). */
const HexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Couleur hex invalide");

/** Branding + apparence appliqués dynamiquement par le launcher. */
export const BrandingSchema = z.object({
  /** Texte affiché en haut du launcher. */
  title: z.string().min(1).max(60),
  /** Description courte. */
  description: z.string().max(280).default(""),
  /** URL absolue du logo (PNG/SVG). Optionnel. */
  logoUrl: z.string().url().optional(),
  /** URL absolue de l'image de fond. Optionnel. */
  backgroundUrl: z.string().url().optional(),
  primaryColor: HexColor.default("#5b8cff"),
  secondaryColor: HexColor.default("#00d18f"),
  textColor: HexColor.default("#e6edf3"),
  theme: z.enum(["dark", "light"]).default("dark"),
  visualStyle: VisualStyleSchema.default("premium"),
  /** Style du bouton Jouer. */
  buttonStyle: z.enum(["glow", "flat", "pixel", "outline"]).default("glow"),
  /** Forme des cartes. */
  cardShape: z.enum(["rounded", "sharp", "pill"]).default("rounded"),
  /** Placement du menu. */
  menuPlacement: z.enum(["left", "top"]).default("left"),
  showNews: z.boolean().default(true),
  showDiscord: z.boolean().default(false),
  showWebsite: z.boolean().default(false),
  discordUrl: z.string().url().optional(),
  websiteUrl: z.string().url().optional(),
  /** URL de support (Discord/ticket) pour le bouton "J'ai un problème". */
  supportUrl: z.string().url().optional(),
  /** Ambiance animée du fond selon l'univers du serveur. */
  ambiance: AmbianceSchema.default("none"),
});
export type Branding = z.infer<typeof BrandingSchema>;

/** Un fichier téléchargeable (mod, resource pack, shader, config...). */
export const DownloadableFileSchema = z.object({
  /** Identifiant stable (slug du mod ou hash). */
  id: z.string().min(1),
  /** Nom lisible affiché dans le launcher. */
  name: z.string().min(1),
  /** Nom de fichier final sur le disque, ex: "sodium-0.5.8.jar". */
  fileName: z.string().min(1),
  /** URL de téléchargement directe. */
  url: z.string().url(),
  /** Hash SHA-1 pour vérifier/éviter de re-télécharger. Recommandé. */
  sha1: z.string().optional(),
  /** Taille en octets si connue (pour la barre de progression). */
  size: z.number().int().nonnegative().optional(),
  source: FileSourceSchema.default("direct"),
  /** Si false, l'utilisateur peut désactiver ce mod. */
  required: z.boolean().default(true),
  /** Métadonnées d'affichage (catalogue dans le launcher). */
  iconUrl: z.string().url().optional(),
  description: z.string().max(280).optional(),
  version: z.string().optional(),
});
export type DownloadableFile = z.infer<typeof DownloadableFileSchema>;

/** Catégorie d'actualité (badge coloré dans le launcher). */
export const NewsCategorySchema = z.enum([
  "update",
  "event",
  "patch",
  "shop",
  "maintenance",
  "community",
]);
export type NewsCategory = z.infer<typeof NewsCategorySchema>;

/** Une actualité affichée dans le launcher. */
export const NewsEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().max(500).default(""),
  imageUrl: z.string().url().optional(),
  /** Date ISO (jour) de l'actualité. */
  date: z.string().default(""),
  /** Bouton facultatif. */
  buttonLabel: z.string().max(40).optional(),
  buttonUrl: z.string().url().optional(),
  /** Catégorie (badge). */
  category: NewsCategorySchema.optional(),
  /** Affiche un badge "Nouveau". */
  isNew: z.boolean().optional(),
  /** Temps de lecture estimé en minutes. */
  readMinutes: z.number().int().positive().optional(),
});
export type NewsEntry = z.infer<typeof NewsEntrySchema>;

/** Un événement du serveur (page Événements + compte à rebours). */
export const EventEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().max(500).default(""),
  imageUrl: z.string().url().optional(),
  /** Date/heure ISO de l'événement (pour le compte à rebours). */
  startsAt: z.string().default(""),
  /** Récompenses, texte libre. */
  rewards: z.string().max(280).optional(),
  buttonLabel: z.string().max(40).optional(),
  buttonUrl: z.string().url().optional(),
});
export type EventEntry = z.infer<typeof EventEntrySchema>;

/** Une note de mise à jour (patch note). */
export const PatchNoteSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1).max(40),
  date: z.string().default(""),
  /** Lignes de changements (une par nouveauté/correction). */
  lines: z.array(z.string()).default([]),
});
export type PatchNote = z.infer<typeof PatchNoteSchema>;

/** État de maintenance du serveur. */
export const MaintenanceSchema = z.object({
  active: z.boolean().default(false),
  reason: z.string().max(280).optional(),
  /** Heure de retour prévue (texte ou ISO). */
  until: z.string().optional(),
});
export type Maintenance = z.infer<typeof MaintenanceSchema>;

/** Bannière d'alerte prioritaire affichée en haut du launcher. */
export const AlertSchema = z.object({
  active: z.boolean().default(false),
  kind: z.enum(["info", "warn", "update"]).default("info"),
  message: z.string().max(280).default(""),
});
export type Alert = z.infer<typeof AlertSchema>;

/** Configuration de la version de Minecraft + loader. */
export const MinecraftConfigSchema = z.object({
  /** Version vanilla, ex: "1.21.1". */
  version: z.string().min(1),
  loader: ModLoaderSchema.default("vanilla"),
  /** Version du loader (ex Fabric "0.16.5"). Optionnel = dernière connue. */
  loaderVersion: z.string().optional(),
  /**
   * Version majeure de Java à utiliser (8, 17, 21...). Le launcher
   * téléchargera ce runtime si absent. Optionnel = déduit de la version MC.
   */
  javaMajor: z.number().int().positive().optional(),
});
export type MinecraftConfig = z.infer<typeof MinecraftConfigSchema>;

/** Serveur Minecraft auquel le launcher peut connecter le joueur. */
export const ServerConfigSchema = z.object({
  address: z.string().optional(),
  port: z.number().int().positive().optional(),
});
export type ServerConfig = z.infer<typeof ServerConfigSchema>;

/** Limites mémoire de la JVM, en mégaoctets. */
export const MemorySchema = z.object({
  min: z.number().int().positive().default(1024),
  max: z.number().int().positive().default(4096),
});
export type Memory = z.infer<typeof MemorySchema>;

/** Le manifeste complet servi par le site et lu par le launcher. */
export const LauncherManifestSchema = z.object({
  schemaVersion: z.literal(MANIFEST_SCHEMA_VERSION),
  /** Identifiant/slug unique du launcher (le "code" entré par le joueur). */
  id: z.string().min(1),
  /** Date ISO de dernière modification, sert d'indicateur de mise à jour. */
  updatedAt: z.string().datetime(),
  /** Type de launcher (étiquette descriptive). */
  launcherType: LauncherTypeSchema.default("vanilla"),
  /** Message affiché avant le lancement du jeu. */
  preLaunchMessage: z.string().max(280).default(""),
  branding: BrandingSchema,
  minecraft: MinecraftConfigSchema,
  server: ServerConfigSchema.default({}),
  memory: MemorySchema.default({ min: 1024, max: 4096 }),
  mods: z.array(DownloadableFileSchema).default([]),
  resourcepacks: z.array(DownloadableFileSchema).default([]),
  shaderpacks: z.array(DownloadableFileSchema).default([]),
  news: z.array(NewsEntrySchema).default([]),
  events: z.array(EventEntrySchema).default([]),
  patchNotes: z.array(PatchNoteSchema).default([]),
  maintenance: MaintenanceSchema.default({ active: false }),
  alert: AlertSchema.default({ active: false, kind: "info", message: "" }),
  /** Arguments JVM additionnels, ex: ["-XX:+UseG1GC"]. */
  jvmArgs: z.array(z.string()).default([]),
});
export type LauncherManifest = z.infer<typeof LauncherManifestSchema>;

/**
 * Parse et valide un manifeste inconnu (réponse réseau dans le launcher).
 * Lève une ZodError si invalide.
 */
export function parseManifest(input: unknown): LauncherManifest {
  return LauncherManifestSchema.parse(input);
}

/** Variante "safe" qui ne lève pas. */
export function safeParseManifest(input: unknown) {
  return LauncherManifestSchema.safeParse(input);
}
