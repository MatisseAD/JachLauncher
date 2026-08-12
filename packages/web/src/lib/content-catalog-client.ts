import type { DownloadableFile } from "@jach/shared";

export type CatalogContentKind = "mod" | "resourcepack" | "shaderpack";

export const CATALOG_CONTENT_KINDS = [
  "mod",
  "resourcepack",
  "shaderpack",
] as const;

/** Garde chaque fichier résolu dans son répertoire Minecraft réel. */
export function groupResolvedContentByKind(
  resolved: Array<{ kind: CatalogContentKind; file: DownloadableFile }>,
): Record<CatalogContentKind, DownloadableFile[]> {
  const grouped: Record<CatalogContentKind, DownloadableFile[]> = {
    mod: [],
    resourcepack: [],
    shaderpack: [],
  };
  for (const entry of resolved) grouped[entry.kind].push(entry.file);
  return grouped;
}
