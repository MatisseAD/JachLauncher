import crypto from "node:crypto";
import { normalizeBaseUrl } from "./security";

const INSTANCE_SLUG_PATTERN = /^[a-z0-9-]{3,40}$/;

/** Clé stable et non ambiguë d'une origine de manifestes. */
export function instanceOriginKey(baseUrl: string): string {
  return crypto
    .createHash("sha256")
    .update(normalizeBaseUrl(baseUrl), "utf8")
    .digest("hex")
    .slice(0, 32);
}

/** Segments sûrs du répertoire d'une instance : origine puis slug. */
export function instancePathSegments(
  baseUrl: string,
  slug: string,
): [originKey: string, slug: string] {
  if (!INSTANCE_SLUG_PATTERN.test(slug)) {
    throw new Error(
      "Identifiant de launcher invalide pour une instance locale.",
    );
  }
  return [instanceOriginKey(baseUrl), slug];
}
