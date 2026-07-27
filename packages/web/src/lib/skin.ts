import type { SkinConfig, SkinLink } from "@jach/ui";
import type { LauncherFormData } from "./launcher-types";
import { assetUrl } from "./asset";

/** Construit la config visuelle du skin à partir de l'état du formulaire. */
export function formToSkinConfig(d: LauncherFormData): SkinConfig {
  const links: SkinLink[] = [];
  if (d.showDiscord && d.discordUrl)
    links.push({
      id: "discord",
      label: "Discord",
      url: d.discordUrl,
      icon: "💬",
    });
  if (d.showWebsite && d.websiteUrl)
    links.push({
      id: "website",
      label: "Site web",
      url: d.websiteUrl,
      icon: "🌐",
    });

  return {
    title: d.title || "Mon Launcher",
    logoUrl: assetUrl(d.logoUrl),
    backgroundUrl: assetUrl(d.backgroundUrl),
    primaryColor: d.primaryColor,
    secondaryColor: d.secondaryColor,
    textColor: d.textColor,
    theme: d.theme,
    visualStyle: d.visualStyle,
    buttonStyle: d.buttonStyle,
    cardShape: d.cardShape,
    menuPlacement: d.menuPlacement,
    showNews: d.showNews,
    ambiance: d.ambiance,
    supportUrl: d.supportUrl ?? undefined,
    mcVersion: d.mcVersion,
    loader: d.loader,
    launcherType: d.launcherType,
    preLaunchMessage: d.preLaunchMessage,
    news: d.news.map((n) => ({ ...n, imageUrl: assetUrl(n.imageUrl) })),
    events: d.events.map((e) => ({ ...e, imageUrl: assetUrl(e.imageUrl) })),
    patchNotes: d.patchNotes,
    maintenance: d.maintenance,
    alert: d.alert,
    mods: d.mods.map((m) => ({
      id: m.id,
      name: m.name || m.fileName,
      version: m.version,
      size: formatBytes(m.size),
      description: m.description,
      iconUrl: assetUrl(m.iconUrl),
      status: m.required ? ("installed" as const) : ("disabled" as const),
    })),
    profiles: [
      {
        id: "default",
        name: d.title || "Profil principal",
        mcVersion: d.mcVersion,
        loader: d.loader,
        modCount: d.mods.length,
        ramMb: d.memMax,
        status: "ready" as const,
      },
    ],
    links,
  };
}

function formatBytes(bytes: number): string {
  if (!bytes) return "taille requise";
  if (bytes >= 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} Gio`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mio`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} Kio`;
  return `${bytes} o`;
}
