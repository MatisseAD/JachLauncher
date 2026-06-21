import type { Prisma, Launcher } from "@prisma/client";
import type { LauncherInput, LauncherUpdate } from "./validation";
import type { LauncherFormData } from "./launcher-types";

function parseArr<T>(json: string): T[] {
  try {
    const a = JSON.parse(json);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

function parseObj<T>(json: string, fallback: T): T {
  try {
    const o = JSON.parse(json);
    return o && typeof o === "object" ? (o as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Convertit une ligne Launcher (DB) vers l'état du formulaire/preview. */
export function rowToForm(l: Launcher): LauncherFormData {
  return {
    id: l.id,
    slug: l.slug,
    title: l.title,
    description: l.description,
    status: l.status as LauncherFormData["status"],
    favorite: l.favorite,
    logoUrl: l.logoUrl,
    backgroundUrl: l.backgroundUrl,
    primaryColor: l.primaryColor,
    secondaryColor: l.secondaryColor,
    textColor: l.textColor,
    theme: l.theme as LauncherFormData["theme"],
    visualStyle: l.visualStyle as LauncherFormData["visualStyle"],
    buttonStyle: l.buttonStyle as LauncherFormData["buttonStyle"],
    cardShape: l.cardShape as LauncherFormData["cardShape"],
    menuPlacement: l.menuPlacement as LauncherFormData["menuPlacement"],
    showNews: l.showNews,
    showDiscord: l.showDiscord,
    showWebsite: l.showWebsite,
    discordUrl: l.discordUrl,
    websiteUrl: l.websiteUrl,
    supportUrl: l.supportUrl,
    ambiance: l.ambiance as LauncherFormData["ambiance"],
    mcVersion: l.mcVersion,
    loader: l.loader as LauncherFormData["loader"],
    loaderVersion: l.loaderVersion,
    javaMajor: l.javaMajor,
    launcherType: l.launcherType as LauncherFormData["launcherType"],
    serverAddress: l.serverAddress,
    serverPort: l.serverPort,
    preLaunchMessage: l.preLaunchMessage,
    memMin: l.memMin,
    memMax: l.memMax,
    mods: parseArr(l.mods),
    resourcepacks: parseArr(l.resourcepacks),
    shaderpacks: parseArr(l.shaderpacks),
    news: parseArr(l.news),
    events: parseArr(l.events),
    patchNotes: parseArr(l.patchNotes),
    maintenance: parseObj(l.maintenance, { active: false }),
    alert: parseObj(l.alert, { active: false, kind: "info" as const, message: "" }),
    jvmArgs: parseArr(l.jvmArgs),
  };
}

// Champs stockés en JSON (tableaux/objets sérialisés).
const JSON_FIELDS = [
  "mods",
  "resourcepacks",
  "shaderpacks",
  "news",
  "events",
  "patchNotes",
  "maintenance",
  "alert",
  "jvmArgs",
] as const;

// Champs scalaires nullable (string/number) : `undefined` -> on ignore,
// valeur fournie (y compris null) -> on écrit null si vide.
const NULLABLE_FIELDS = [
  "logoUrl",
  "backgroundUrl",
  "discordUrl",
  "websiteUrl",
  "supportUrl",
  "loaderVersion",
  "javaMajor",
  "serverAddress",
  "serverPort",
] as const;

/** Mapping complet LauncherInput -> données de création Prisma. */
export function toCreateData(
  input: LauncherInput,
  ownerId: string,
): Prisma.LauncherUncheckedCreateInput {
  return {
    ownerId,
    slug: input.slug,
    title: input.title,
    description: input.description,
    status: input.status,
    favorite: input.favorite,
    logoUrl: input.logoUrl ?? null,
    backgroundUrl: input.backgroundUrl ?? null,
    primaryColor: input.primaryColor,
    secondaryColor: input.secondaryColor,
    textColor: input.textColor,
    theme: input.theme,
    visualStyle: input.visualStyle,
    buttonStyle: input.buttonStyle,
    cardShape: input.cardShape,
    menuPlacement: input.menuPlacement,
    showNews: input.showNews,
    showDiscord: input.showDiscord,
    showWebsite: input.showWebsite,
    discordUrl: input.discordUrl ?? null,
    websiteUrl: input.websiteUrl ?? null,
    supportUrl: input.supportUrl ?? null,
    ambiance: input.ambiance,
    mcVersion: input.mcVersion,
    loader: input.loader,
    loaderVersion: input.loaderVersion ?? null,
    javaMajor: input.javaMajor ?? null,
    launcherType: input.launcherType,
    serverAddress: input.serverAddress ?? null,
    serverPort: input.serverPort ?? null,
    preLaunchMessage: input.preLaunchMessage,
    memMin: input.memMin,
    memMax: input.memMax,
    mods: JSON.stringify(input.mods),
    resourcepacks: JSON.stringify(input.resourcepacks),
    shaderpacks: JSON.stringify(input.shaderpacks),
    news: JSON.stringify(input.news),
    events: JSON.stringify(input.events),
    patchNotes: JSON.stringify(input.patchNotes),
    maintenance: JSON.stringify(input.maintenance),
    alert: JSON.stringify(input.alert),
    jvmArgs: JSON.stringify(input.jvmArgs),
  };
}

/** Mapping partiel (PATCH) : seuls les champs fournis sont écrits. */
export function toUpdateData(input: LauncherUpdate): Prisma.LauncherUncheckedUpdateInput {
  const data: Prisma.LauncherUncheckedUpdateInput = {};
  const src = input as Record<string, unknown>;

  for (const [key, value] of Object.entries(src)) {
    if (value === undefined) continue;
    if ((JSON_FIELDS as readonly string[]).includes(key)) {
      (data as Record<string, unknown>)[key] = JSON.stringify(value);
    } else if ((NULLABLE_FIELDS as readonly string[]).includes(key)) {
      (data as Record<string, unknown>)[key] = value ?? null;
    } else {
      (data as Record<string, unknown>)[key] = value;
    }
  }
  return data;
}
