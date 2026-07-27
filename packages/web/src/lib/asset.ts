/**
 * Résout une URL d'asset stockée (relative au stockage, ou absolue) vers une
 * URL utilisable dans le navigateur.
 */
export function assetUrl(stored?: string | null): string | undefined {
  if (!stored) return undefined;
  if (/^https?:\/\//i.test(stored) || stored.startsWith("data:")) return stored;
  return `/api/storage/${stored}`;
}
