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
export const MANIFEST_SCHEMA_VERSION = 2;

/** Limite dure par fichier (2 Gio) pour éviter les téléchargements non bornés. */
export const MAX_DOWNLOAD_BYTES = 2 * 1024 * 1024 * 1024;

/** Identifiant de launcher partageable et sûr comme segment de chemin. */
export const SafeSlugSchema = z
  .string()
  .min(3)
  .max(40)
  .regex(
    /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
    "Lettres minuscules, chiffres et tirets uniquement",
  );

/** Version Minecraft/loader : segment simple, jamais un chemin. */
export const VersionIdSchema = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._+-]*$/, "Identifiant de version invalide")
  .refine((value) => !value.includes(".."), "Identifiant de version invalide");

/** Nom de fichier portable et sans traversée de répertoire. */
export const SafeFileNameSchema = z
  .string()
  .min(1)
  .max(180)
  .regex(/^(?!\.{1,2}$)(?!.*[<>:"/\\|?*])[^/\\]+$/, "Nom de fichier invalide")
  .refine(
    (value) => [...value].every((character) => character.charCodeAt(0) > 31),
    "Caractère de contrôle interdit",
  )
  .refine(
    (value) => !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(value),
    "Nom de fichier réservé",
  );

/**
 * URL distante autorisée. HTTPS est obligatoire, sauf pour localhost en
 * développement. Les protocoles file:, javascript:, data:, etc. sont refusés.
 */
export const HttpUrlSchema = z
  .string()
  .url()
  .superRefine((value, ctx) => {
    const url = new URL(value);
    const localHost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname === "[::1]";
    if (url.protocol !== "https:" && !(url.protocol === "http:" && localHost)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "HTTPS obligatoire (HTTP autorisé uniquement sur localhost)",
      });
    }
    if (url.username || url.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Identifiants interdits dans l’URL",
      });
    }
  });

/** Sous-ensemble de paramètres JVM sans chargement de code ni commande externe. */
export const SafeJvmArgSchema = z
  .string()
  .min(1)
  .max(120)
  .refine(
    (value) =>
      [
        /^-XX:[+-](?:UseG1GC|UnlockExperimentalVMOptions|DisableExplicitGC|PerfDisableSharedMem)$/,
        /^-XX:(?:MaxGCPauseMillis|G1NewSizePercent|G1MaxNewSizePercent|G1ReservePercent|G1HeapWastePercent|G1MixedGCCountTarget|InitiatingHeapOccupancyPercent|G1MixedGCLiveThresholdPercent|G1RSetUpdatingPauseTimePercent|SurvivorRatio|MaxTenuringThreshold)=\d{1,6}$/,
        /^-XX:G1HeapRegionSize=\d{1,4}[mM]$/,
      ].some((pattern) => pattern.test(value)),
    "Argument JVM non autorisé",
  );

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
  logoUrl: HttpUrlSchema.optional(),
  /** URL absolue de l'image de fond. Optionnel. */
  backgroundUrl: HttpUrlSchema.optional(),
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
  discordUrl: HttpUrlSchema.optional(),
  websiteUrl: HttpUrlSchema.optional(),
  /** URL de support (Discord/ticket) pour le bouton "J'ai un problème". */
  supportUrl: HttpUrlSchema.optional(),
  /** Ambiance animée du fond selon l'univers du serveur. */
  ambiance: AmbianceSchema.default("none"),
});
export type Branding = z.infer<typeof BrandingSchema>;

/** Un fichier téléchargeable (mod, resource pack, shader, config...). */
export const DownloadableFileSchema = z.object({
  /** Identifiant stable (slug du mod ou hash). */
  id: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/, "Identifiant de fichier invalide"),
  /** Nom lisible affiché dans le launcher. */
  name: z.string().min(1).max(120),
  /** Nom de fichier final sur le disque, ex: "sodium-0.5.8.jar". */
  fileName: SafeFileNameSchema,
  /** URL de téléchargement directe. */
  url: HttpUrlSchema,
  /** Hash SHA-256 obligatoire : intégrité, cache et consentement vérifiable. */
  sha256: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "SHA-256 invalide")
    .transform((value) => value.toLowerCase()),
  /** Taille en octets obligatoire, contrôlée avant et pendant le téléchargement. */
  size: z.number().int().positive().max(MAX_DOWNLOAD_BYTES),
  source: FileSourceSchema.default("direct"),
  /** Si false, ce contenu facultatif n'est pas imposé par le launcher. */
  required: z.boolean().default(true),
  /** Métadonnées d'affichage (catalogue dans le launcher). */
  iconUrl: HttpUrlSchema.optional(),
  description: z.string().max(280).optional(),
  version: z.string().max(80).optional(),
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
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(120),
  description: z.string().max(500).default(""),
  imageUrl: HttpUrlSchema.optional(),
  /** Date ISO (jour) de l'actualité. */
  date: z.string().max(40).default(""),
  /** Bouton facultatif. */
  buttonLabel: z.string().max(40).optional(),
  buttonUrl: HttpUrlSchema.optional(),
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
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(120),
  description: z.string().max(500).default(""),
  imageUrl: HttpUrlSchema.optional(),
  /** Date/heure ISO de l'événement (pour le compte à rebours). */
  startsAt: z.string().max(40).default(""),
  /** Récompenses, texte libre. */
  rewards: z.string().max(280).optional(),
  buttonLabel: z.string().max(40).optional(),
  buttonUrl: HttpUrlSchema.optional(),
});
export type EventEntry = z.infer<typeof EventEntrySchema>;

/** Une note de mise à jour (patch note). */
export const PatchNoteSchema = z.object({
  id: z.string().min(1).max(80),
  version: z.string().min(1).max(40),
  date: z.string().max(40).default(""),
  /** Lignes de changements (une par nouveauté/correction). */
  lines: z.array(z.string().max(500)).max(200).default([]),
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
  version: VersionIdSchema,
  loader: ModLoaderSchema.default("vanilla"),
  /** Version du loader (ex Fabric "0.16.5"). Optionnel = dernière connue. */
  loaderVersion: VersionIdSchema.optional(),
  /**
   * Version majeure de Java à utiliser (8, 17, 21...). Le launcher
   * téléchargera ce runtime si absent. Optionnel = déduit de la version MC.
   */
  javaMajor: z.number().int().positive().optional(),
});
export type MinecraftConfig = z.infer<typeof MinecraftConfigSchema>;

/** Serveur Minecraft auquel le launcher peut connecter le joueur. */
export const ServerConfigSchema = z.object({
  address: z
    .string()
    .min(1)
    .max(253)
    .regex(/^[a-zA-Z0-9._:-]+$/, "Adresse serveur invalide")
    .optional(),
  port: z.number().int().min(1).max(65535).optional(),
});
export type ServerConfig = z.infer<typeof ServerConfigSchema>;

/** Limites mémoire de la JVM, en mégaoctets. */
export const MemorySchema = z.object({
  min: z.number().int().min(512).max(65536).default(1024),
  max: z.number().int().min(512).max(65536).default(4096),
});
export type Memory = z.infer<typeof MemorySchema>;

/** Signature du manifeste normalisé, générée côté serveur avec Ed25519. */
export const ManifestSignatureSchema = z.object({
  algorithm: z.literal("ed25519"),
  /** Clé publique SPKI DER encodée en base64. */
  publicKey: z
    .string()
    .min(40)
    .max(200)
    .regex(/^[a-zA-Z0-9+/]+={0,2}$/, "Clé publique invalide"),
  /** Signature Ed25519 encodée en base64. */
  value: z
    .string()
    .min(80)
    .max(120)
    .regex(/^[a-zA-Z0-9+/]+={0,2}$/, "Signature invalide"),
});
export type ManifestSignature = z.infer<typeof ManifestSignatureSchema>;

/** Le manifeste complet servi par le site et lu par le launcher. */
export const LauncherManifestSchema = z
  .object({
    schemaVersion: z.literal(MANIFEST_SCHEMA_VERSION),
    /** Identifiant/slug unique du launcher (le "code" entré par le joueur). */
    id: SafeSlugSchema,
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
    mods: z.array(DownloadableFileSchema).max(512).default([]),
    resourcepacks: z.array(DownloadableFileSchema).max(128).default([]),
    shaderpacks: z.array(DownloadableFileSchema).max(64).default([]),
    news: z.array(NewsEntrySchema).max(100).default([]),
    events: z.array(EventEntrySchema).max(100).default([]),
    patchNotes: z.array(PatchNoteSchema).max(100).default([]),
    maintenance: MaintenanceSchema.default({ active: false }),
    alert: AlertSchema.default({ active: false, kind: "info", message: "" }),
    /** Arguments JVM additionnels, ex: ["-XX:+UseG1GC"]. */
    jvmArgs: z.array(SafeJvmArgSchema).max(32).default([]),
    /** Absente en développement si aucune clé de signature n'est configurée. */
    signature: ManifestSignatureSchema.optional(),
  })
  .superRefine((manifest, ctx) => {
    if (manifest.memory.min > manifest.memory.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["memory", "min"],
        message:
          "La RAM minimale doit être inférieure ou égale à la RAM maximale",
      });
    }

    for (const [category, files] of [
      ["mods", manifest.mods],
      ["resourcepacks", manifest.resourcepacks],
      ["shaderpacks", manifest.shaderpacks],
    ] as const) {
      const names = new Set<string>();
      for (const file of files) {
        const key = file.fileName.toLowerCase();
        if (names.has(key)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [category],
            message: `Nom de fichier dupliqué : ${file.fileName}`,
          });
        }
        names.add(key);
      }
    }
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

/** Sérialisation JSON déterministe utilisée par l'empreinte et la signature. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([first], [second]) => first.localeCompare(second))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`);
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Charge utile signée : le manifeste normalisé sans le bloc de signature. */
export function canonicalManifestPayload(manifest: LauncherManifest): string {
  const { signature: _signature, ...unsigned } = manifest;
  return canonicalJson(unsigned);
}
