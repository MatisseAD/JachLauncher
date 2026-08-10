const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

export const WINDOWS_UPDATE_FEED_URL =
  "https://5v6eph0amoamojpm.public.blob.vercel-storage.com/releases/windows";

export function validateUpdateFeedUrl(input: string): string {
  const url = new URL(input.trim());
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      "Le canal de mise à jour doit être une URL HTTPS publique.",
    );
  }
  return url.toString().replace(/\/+$/, "");
}

export function validDesktopVersion(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const version = input.trim();
  return SEMVER_PATTERN.test(version) ? version : null;
}

/** Message court et actionnable, sans exposer la pile interne au renderer. */
export function describeUpdaterError(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  if (/404|latest(?:-[^.]+)?\.yml|ENOENT/i.test(detail)) {
    return "Le canal de mise à jour est incomplet (latest.yml introuvable). Réessaie plus tard ou télécharge l'installateur depuis le site.";
  }
  if (
    /sha512|checksum|signature|integrity|ERR_UPDATER_INVALID_SIGNATURE/i.test(
      detail,
    )
  ) {
    return "Le contrôle d'intégrité de la mise à jour a échoué. Elle n'a pas été installée.";
  }
  if (/net::|ENOTFOUND|ECONN|ETIMEDOUT|ERR_INTERNET|network/i.test(detail)) {
    return "Le serveur de mise à jour est injoignable. Vérifie ta connexion puis relance la vérification.";
  }
  return "La mise à jour a échoué. Relance la vérification ou télécharge l'installateur depuis le site.";
}
