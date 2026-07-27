import { promises as fs } from "node:fs";
import path from "node:path";
import type { LaunchProgress } from "../shared-types/ipc";
import { minecraftRoot } from "./store";
import { clearInstanceMetadata } from "./instance";
import { removeManagedContent } from "./launch";

type Emit = (p: LaunchProgress) => void;
type Log = (line: string) => void;

/**
 * Répare une instance : supprime le contenu téléchargé (mods, packs, profils
 * de loader) pour forcer une revérification + retéléchargement au prochain
 * lancement. Conserve la version vanilla, les libs et assets (gros volume).
 */
export async function repairInstance(
  slug: string,
  emit: Emit,
  log: Log,
): Promise<void> {
  const root = minecraftRoot(slug);
  emit({
    phase: "downloading",
    label: "Réparation : nettoyage des fichiers…",
    percent: null,
  });

  await removeManagedContent(root, log);
  await clearInstanceMetadata(slug);

  // Supprime les profils de loader custom (fabric-loader-*, quilt-*, forge-*…)
  // pour forcer leur réinstallation. La version vanilla est conservée.
  const versionsDir = path.join(root, "versions");
  try {
    const entries = await fs.readdir(versionsDir);
    for (const e of entries) {
      if (/fabric|quilt|forge|neoforge/i.test(e)) {
        await fs
          .rm(path.join(versionsDir, e), { recursive: true, force: true })
          .catch(() => {});
        log(`Profil loader réinitialisé : ${e}`);
      }
    }
  } catch {
    /* pas de dossier versions, rien à faire */
  }

  emit({
    phase: "idle",
    label: "Réparation terminée — clique sur Jouer",
    percent: null,
  });
  log("Réparation terminée.");
}
