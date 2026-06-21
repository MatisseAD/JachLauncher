// Récupère la liste des versions Minecraft depuis le manifeste officiel Mojang
// (mise en cache au niveau module). Repli sur une liste statique si hors-ligne.

const MANIFEST_URL = "https://launchermeta.mojang.com/mc/game/version_manifest_v2.json";

/** Liste de secours (versions release populaires) si le manifeste est injoignable. */
export const FALLBACK_VERSIONS = [
  "1.21.4", "1.21.3", "1.21.1", "1.21",
  "1.20.6", "1.20.4", "1.20.2", "1.20.1", "1.20",
  "1.19.4", "1.19.2", "1.19",
  "1.18.2", "1.18.1", "1.17.1",
  "1.16.5", "1.16.4", "1.15.2", "1.14.4",
  "1.12.2", "1.10.2", "1.8.9", "1.7.10",
];

let cache: string[] | null = null;
let inflight: Promise<string[]> | null = null;

interface ManifestVersion {
  id: string;
  type: string;
}

/** Versions release Minecraft (les plus récentes en premier). */
export async function fetchReleaseVersions(includeSnapshots = false): Promise<string[]> {
  if (cache && !includeSnapshots) return cache;
  if (inflight && !includeSnapshots) return inflight;

  const load = (async () => {
    try {
      const res = await fetch(MANIFEST_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { versions: ManifestVersion[] };
      const wanted = includeSnapshots
        ? ["release", "snapshot"]
        : ["release"];
      const ids = data.versions.filter((v) => wanted.includes(v.type)).map((v) => v.id);
      if (!includeSnapshots) cache = ids;
      return ids;
    } catch {
      return FALLBACK_VERSIONS;
    } finally {
      inflight = null;
    }
  })();

  if (!includeSnapshots) inflight = load;
  return load;
}
