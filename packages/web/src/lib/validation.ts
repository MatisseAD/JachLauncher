import { z } from "zod";
import {
  DownloadableFileSchema,
  ModLoaderSchema,
  VisualStyleSchema,
  LauncherTypeSchema,
  LauncherStatusSchema,
  NewsEntrySchema,
  EventEntrySchema,
  PatchNoteSchema,
  MaintenanceSchema,
  AlertSchema,
  AmbianceSchema,
  HttpUrlSchema,
  SafeJvmArgSchema,
  SafeSlugSchema,
  VersionIdSchema,
} from "@jach/shared";

// Schéma d'entrée du formulaire d'édition d'un launcher (côté site).
// Tout est requis à la création ; partiel à l'update.

const HexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Couleur hex invalide");
const StoredAsset = z.union([
  HttpUrlSchema,
  z
    .string()
    .max(200)
    .regex(
      /^[a-zA-Z0-9_-]+\/[0-9a-f]{16}\.(?:png|jpg|gif|webp)$/,
      "Chemin d'asset invalide",
    ),
]);

const LauncherInputBaseSchema = z.object({
  // Méta
  title: z.string().min(1).max(60),
  slug: SafeSlugSchema,
  description: z.string().max(280).default(""),
  status: LauncherStatusSchema.default("draft"),
  favorite: z.boolean().default(false),

  // Apparence
  logoUrl: StoredAsset.optional().nullable(),
  backgroundUrl: StoredAsset.optional().nullable(),
  primaryColor: HexColor.default("#5b8cff"),
  secondaryColor: HexColor.default("#00d18f"),
  textColor: HexColor.default("#e6edf3"),
  theme: z.enum(["dark", "light"]).default("dark"),
  visualStyle: VisualStyleSchema.default("premium"),
  buttonStyle: z.enum(["glow", "flat", "pixel", "outline"]).default("glow"),
  cardShape: z.enum(["rounded", "sharp", "pill"]).default("rounded"),
  menuPlacement: z.enum(["left", "top"]).default("left"),
  backgroundFit: z.enum(["cover", "contain", "fill"]).default("cover"),
  backgroundPosition: z
    .enum(["center", "top", "bottom", "left", "right"])
    .default("center"),
  backgroundOverlay: z.number().int().min(0).max(90).default(48),
  backgroundBlur: z.number().int().min(0).max(20).default(0),
  panelOpacity: z.number().int().min(20).max(100).default(72),
  fontFamily: z
    .enum(["poppins", "inter", "system", "serif", "pixel"])
    .default("poppins"),
  cornerRadius: z.number().int().min(0).max(32).default(14),
  contentDensity: z
    .enum(["compact", "comfortable", "spacious"])
    .default("comfortable"),
  sidebarStyle: z.enum(["glass", "solid", "floating"]).default("glass"),
  logoShape: z.enum(["square", "rounded", "circle"]).default("rounded"),
  playButtonLabel: z.string().trim().min(1).max(24).default("JOUER"),
  showServerStatus: z.boolean().default(true),
  showNews: z.boolean().default(true),
  showDiscord: z.boolean().default(false),
  showWebsite: z.boolean().default(false),
  discordUrl: HttpUrlSchema.optional().nullable(),
  websiteUrl: HttpUrlSchema.optional().nullable(),
  supportUrl: HttpUrlSchema.optional().nullable(),
  ambiance: AmbianceSchema.default("none"),

  // Minecraft
  mcVersion: VersionIdSchema,
  loader: ModLoaderSchema.default("vanilla"),
  loaderVersion: VersionIdSchema.optional().nullable(),
  javaMajor: z.number().int().min(8).max(30).optional().nullable(),
  launcherType: LauncherTypeSchema.default("vanilla"),
  serverAddress: z
    .string()
    .min(1)
    .max(253)
    .regex(/^[a-zA-Z0-9._:-]+$/, "Adresse serveur invalide")
    .optional()
    .nullable(),
  serverPort: z.number().int().min(1).max(65535).optional().nullable(),
  preLaunchMessage: z.string().max(280).default(""),
  memMin: z.number().int().min(512).max(65536).default(1024),
  memMax: z.number().int().min(512).max(65536).default(4096),

  // Contenu
  mods: z.array(DownloadableFileSchema).max(512).default([]),
  resourcepacks: z.array(DownloadableFileSchema).max(128).default([]),
  shaderpacks: z.array(DownloadableFileSchema).max(64).default([]),
  news: z.array(NewsEntrySchema).max(100).default([]),
  events: z.array(EventEntrySchema).max(100).default([]),
  patchNotes: z.array(PatchNoteSchema).max(100).default([]),
  maintenance: MaintenanceSchema.default({ active: false }),
  alert: AlertSchema.default({ active: false, kind: "info", message: "" }),
  jvmArgs: z.array(SafeJvmArgSchema).max(32).default([]),
});

function validateMemory(
  value: { memMin?: number; memMax?: number },
  ctx: z.RefinementCtx,
): void {
  if (
    value.memMin !== undefined &&
    value.memMax !== undefined &&
    value.memMin > value.memMax
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["memMin"],
      message:
        "La RAM minimale doit être inférieure ou égale à la RAM maximale",
    });
  }
}

export const LauncherInputSchema =
  LauncherInputBaseSchema.superRefine(validateMemory);
export type LauncherInput = z.infer<typeof LauncherInputSchema>;

// Pour l'update : tous les champs deviennent optionnels.
export const LauncherUpdateSchema =
  LauncherInputBaseSchema.partial().superRefine(validateMemory);
export type LauncherUpdate = z.infer<typeof LauncherUpdateSchema>;
