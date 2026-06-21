import { safeParseManifest, type LauncherManifest } from "@jach/shared";
import type { LoadManifestResult } from "../shared-types/ipc";

/**
 * Télécharge le manifeste depuis le site et le valide via le schéma Zod
 * partagé. C'est ici que "le launcher s'adapte à la demande de l'utilisateur".
 */
export async function fetchManifest(
  baseUrl: string,
  slug: string,
): Promise<LoadManifestResult> {
  const url = `${baseUrl.replace(/\/$/, "")}/api/manifest/${encodeURIComponent(slug)}`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: body.error ?? `Erreur HTTP ${res.status}` };
    }
    const json = await res.json();
    const parsed = safeParseManifest(json);
    if (!parsed.success) {
      return { ok: false, error: "Manifeste invalide : " + parsed.error.message };
    }
    return { ok: true, manifest: parsed.data as LauncherManifest };
  } catch (e) {
    return { ok: false, error: `Connexion impossible (${String(e)})` };
  }
}
