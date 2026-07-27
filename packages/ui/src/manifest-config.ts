import type { LauncherManifest } from "@jach/shared";
import type { SkinConfig, SkinLink } from "./types";

/** Construit la config du skin à partir d'un manifeste (côté launcher). */
export function manifestToSkinConfig(m: LauncherManifest): SkinConfig {
  const b = m.branding;
  const links: SkinLink[] = [];
  if (b.showDiscord && b.discordUrl)
    links.push({
      id: "discord",
      label: "Discord",
      url: b.discordUrl,
      icon: "💬",
    });
  if (b.showWebsite && b.websiteUrl)
    links.push({
      id: "website",
      label: "Site web",
      url: b.websiteUrl,
      icon: "🌐",
    });

  return {
    title: b.title,
    logoUrl: b.logoUrl,
    backgroundUrl: b.backgroundUrl,
    primaryColor: b.primaryColor,
    secondaryColor: b.secondaryColor,
    textColor: b.textColor,
    theme: b.theme,
    visualStyle: b.visualStyle,
    buttonStyle: b.buttonStyle,
    cardShape: b.cardShape,
    menuPlacement: b.menuPlacement,
    showNews: b.showNews,
    ambiance: b.ambiance,
    supportUrl: b.supportUrl,
    mcVersion: m.minecraft.version,
    loader: m.minecraft.loader,
    launcherType: m.launcherType,
    preLaunchMessage: m.preLaunchMessage,
    news: m.news,
    events: m.events,
    patchNotes: m.patchNotes,
    maintenance: m.maintenance,
    alert: m.alert,
    mods: m.mods.map((x) => ({
      id: x.id,
      name: x.name,
      version: x.version,
      size: formatBytes(x.size),
      description: x.description,
      iconUrl: x.iconUrl,
      status: x.required ? ("installed" as const) : ("disabled" as const),
    })),
    profiles: [
      {
        id: "default",
        name: b.title,
        mcVersion: m.minecraft.version,
        loader: m.minecraft.loader,
        modCount: m.mods.length,
        ramMb: m.memory.max,
        status: "ready" as const,
      },
    ],
    links,
  };
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Gio`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mio`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} Kio`;
  return `${bytes} o`;
}
