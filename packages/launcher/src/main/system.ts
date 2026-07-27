import os from "node:os";
import type { SystemInfo } from "../shared-types/ipc";

/** Arrondit au multiple de 1024 Mo le plus proche. */
function roundGb(mb: number): number {
  return Math.max(1024, Math.round(mb / 1024) * 1024);
}

/**
 * RAM totale + RAM recommandée pour Minecraft : ~moitié de la RAM totale,
 * bornée entre 2 et 8 Go, en laissant au moins 2 Go au système.
 */
export function getSystemInfo(): SystemInfo {
  const totalRamMb = Math.round(os.totalmem() / (1024 * 1024));
  let rec = roundGb(totalRamMb / 2);
  rec = Math.min(rec, 8192);
  rec = Math.max(rec, 2048);
  rec = Math.min(rec, Math.max(2048, totalRamMb - 2048));
  return { totalRamMb, recommendedRamMb: rec };
}

/** Calcule la RAM (Mo) pour un mode donné. */
export function ramForMode(
  mode: string,
  info: SystemInfo,
  current: number,
): number {
  const { totalRamMb, recommendedRamMb } = info;
  switch (mode) {
    case "low":
      return 2048;
    case "balanced":
    case "auto":
      return recommendedRamMb;
    case "performance":
      return Math.min(
        roundUp(recommendedRamMb * 1.5),
        Math.max(2048, totalRamMb - 2048),
      );
    case "custom":
    default:
      return current;
  }
}

function roundUp(mb: number): number {
  return Math.round(mb / 1024) * 1024;
}
