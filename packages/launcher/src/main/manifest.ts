import {
  SafeSlugSchema,
  safeParseManifest,
  type LauncherManifest,
} from "@jach/shared";
import type { LoadManifestResult } from "../shared-types/ipc";
import { assertSafeRemoteUrl, normalizeBaseUrl } from "./security";

const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;

/** Télécharge et valide le contrat distant avant toute activation. */
export async function fetchManifest(
  baseUrl: string,
  slug: string,
): Promise<LoadManifestResult> {
  const parsedSlug = SafeSlugSchema.safeParse(slug.trim());
  if (!parsedSlug.success) {
    return { ok: false, error: "Code launcher invalide." };
  }

  try {
    const origin = normalizeBaseUrl(baseUrl);
    const url = `${origin}/api/manifest/${encodeURIComponent(parsedSlug.data)}`;
    await assertSafeRemoteUrl(url, { allowLocalhost: true });
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    await assertSafeRemoteUrl(response.url, { allowLocalhost: true });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      return {
        ok: false,
        error: body.error ?? `Erreur HTTP ${response.status}`,
      };
    }
    const length = Number(response.headers.get("content-length") ?? 0);
    if (length > MAX_MANIFEST_BYTES) {
      return { ok: false, error: "Manifeste anormalement volumineux." };
    }
    const text = await response.text();
    if (Buffer.byteLength(text, "utf8") > MAX_MANIFEST_BYTES) {
      return { ok: false, error: "Manifeste anormalement volumineux." };
    }
    const parsed = safeParseManifest(JSON.parse(text));
    if (!parsed.success) {
      return {
        ok: false,
        error: `Manifeste invalide : ${parsed.error.issues[0]?.message ?? "format inconnu"}`,
      };
    }
    if (parsed.data.id !== parsedSlug.data) {
      return {
        ok: false,
        error: "Le manifeste ne correspond pas au code demandé.",
      };
    }
    return { ok: true, manifest: parsed.data as LauncherManifest };
  } catch (error) {
    return { ok: false, error: `Connexion impossible (${String(error)})` };
  }
}
