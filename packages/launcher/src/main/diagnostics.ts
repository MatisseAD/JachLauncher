import os from "node:os";
import { app } from "electron";
import type { Diagnostic } from "../shared-types/ipc";
import { getSystemInfo } from "./system";

/**
 * Traduit une erreur technique en message clair et actionnable pour le joueur.
 */
export function classifyError(message: string): Diagnostic {
  const m = message.toLowerCase();

  if (/sha-1|sha1|incorrect|corromp/.test(m)) {
    return {
      title: "Fichier corrompu",
      message:
        "Un fichier téléchargé est endommagé. Clique sur Réparer pour le retélécharger.",
    };
  }
  if (/enotfound|econnrefused|etimedout|network|fetch failed|connexion|téléchargement échou|http \d/.test(m)) {
    return {
      title: "Problème de connexion",
      message:
        "Le téléchargement a échoué. Vérifie ta connexion Internet puis clique sur Réparer ou Réessayer.",
    };
  }
  if (/outofmemory|heap space|memory|mémoire|-xmx/.test(m)) {
    return {
      title: "RAM insuffisante",
      message:
        "Le jeu n'a pas pu obtenir assez de mémoire. Réduis la RAM allouée dans Paramètres (mode Faible ou Équilibré).",
    };
  }
  if (/java|jvm|jre|jdk/.test(m)) {
    return {
      title: "Problème avec Java",
      message:
        "Java n'a pas pu être préparé. Clique sur Réparer pour réinstaller le bon Java automatiquement.",
    };
  }
  if (/forge|neoforge|fabric|quilt|loader|installeur|installer/.test(m)) {
    return {
      title: "Problème avec le mod loader",
      message:
        "L'installation du mod loader a échoué. Clique sur Réparer pour recommencer l'installation.",
    };
  }
  if (/mod|fichier nécessaire|introuvable|missing/.test(m)) {
    return {
      title: "Fichier manquant",
      message: "Un fichier nécessaire n'a pas été téléchargé. Clique sur Réparer.",
    };
  }
  return {
    title: "Une erreur est survenue",
    message:
      "Quelque chose s'est mal passé. Clique sur Réparer, ou copie le rapport et envoie-le au support.",
  };
}

/** Construit un rapport technique copiable (pour le support). */
export function buildReport(opts: {
  slug?: string | null;
  manifestSummary?: string;
  settingsSummary?: string;
  lastError?: string;
  logTail?: string[];
}): string {
  const info = getSystemInfo();
  const lines = [
    "=== Rapport YourLauncher ===",
    `Date : ${new Date().toISOString()}`,
    `Launcher : ${slugVersion()}`,
    `OS : ${os.type()} ${os.release()} (${process.platform}/${process.arch})`,
    `RAM totale : ${(info.totalRamMb / 1024).toFixed(1)} Go (recommandée ${(info.recommendedRamMb / 1024).toFixed(0)} Go)`,
    `Code launcher : ${opts.slug ?? "—"}`,
    opts.manifestSummary ? `Config : ${opts.manifestSummary}` : "",
    opts.settingsSummary ? `Réglages : ${opts.settingsSummary}` : "",
    "",
    "--- Dernière erreur ---",
    opts.lastError ?? "(aucune)",
    "",
    "--- Derniers logs ---",
    ...(opts.logTail ?? []).slice(-40),
  ];
  return lines.filter((l) => l !== "").join("\n");
}

function slugVersion(): string {
  try {
    return `v${app.getVersion()}`;
  } catch {
    return "v?";
  }
}
