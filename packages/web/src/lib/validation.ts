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
} from "@jach/shared";

// Schéma d'entrée du formulaire d'édition d'un launcher (côté site).
// Tout est requis à la création ; partiel à l'update.

const HexColor = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Couleur hex invalide");

export const LauncherInputSchema = z.object({
  // Méta
  title: z.string().min(1).max(60),
  slug: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[a-z0-9-]+$/, "Lettres minuscules, chiffres et tirets uniquement"),
  description: z.string().max(280).default(""),
  status: LauncherStatusSchema.default("draft"),
  favorite: z.boolean().default(false),

  // Apparence
  logoUrl: z.string().optional().nullable(),
  backgroundUrl: z.string().optional().nullable(),
  primaryColor: HexColor.default("#5b8cff"),
  secondaryColor: HexColor.default("#00d18f"),
  textColor: HexColor.default("#e6edf3"),
  theme: z.enum(["dark", "light"]).default("dark"),
  visualStyle: VisualStyleSchema.default("premium"),
  buttonStyle: z.enum(["glow", "flat", "pixel", "outline"]).default("glow"),
  cardShape: z.enum(["rounded", "sharp", "pill"]).default("rounded"),
  menuPlacement: z.enum(["left", "top"]).default("left"),
  showNews: z.boolean().default(true),
  showDiscord: z.boolean().default(false),
  showWebsite: z.boolean().default(false),
  discordUrl: z.string().optional().nullable(),
  websiteUrl: z.string().optional().nullable(),
  supportUrl: z.string().optional().nullable(),
  ambiance: AmbianceSchema.default("none"),

  // Minecraft
  mcVersion: z.string().min(1),
  loader: ModLoaderSchema.default("vanilla"),
  loaderVersion: z.string().optional().nullable(),
  javaMajor: z.number().int().positive().optional().nullable(),
  launcherType: LauncherTypeSchema.default("vanilla"),
  serverAddress: z.string().optional().nullable(),
  serverPort: z.number().int().positive().optional().nullable(),
  preLaunchMessage: z.string().max(280).default(""),
  memMin: z.number().int().positive().default(1024),
  memMax: z.number().int().positive().default(4096),

  // Contenu
  mods: z.array(DownloadableFileSchema).default([]),
  resourcepacks: z.array(DownloadableFileSchema).default([]),
  shaderpacks: z.array(DownloadableFileSchema).default([]),
  news: z.array(NewsEntrySchema).default([]),
  events: z.array(EventEntrySchema).default([]),
  patchNotes: z.array(PatchNoteSchema).default([]),
  maintenance: MaintenanceSchema.default({ active: false }),
  alert: AlertSchema.default({ active: false, kind: "info", message: "" }),
  jvmArgs: z.array(z.string()).default([]),
});

export type LauncherInput = z.infer<typeof LauncherInputSchema>;

// Pour l'update : tous les champs deviennent optionnels.
export const LauncherUpdateSchema = LauncherInputSchema.partial();
export type LauncherUpdate = z.infer<typeof LauncherUpdateSchema>;
