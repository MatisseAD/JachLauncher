const SEMVER_PATTERN =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

declare const __JACH_SIGNED_UPDATE_FEED_URL__: string | undefined;
declare const __JACH_UPDATE_GITHUB_REPO__: string | undefined;

export const WINDOWS_UPDATE_FEED_URL =
  (typeof __JACH_SIGNED_UPDATE_FEED_URL__ === "string"
    ? __JACH_SIGNED_UPDATE_FEED_URL__
    : process.env.JACH_SIGNED_UPDATE_FEED_URL
  )?.trim() ?? "";

/** Dépôt GitHub publiant les releases du launcher, au format `owner/repo`. */
export const UPDATE_GITHUB_REPOSITORY =
  (typeof __JACH_UPDATE_GITHUB_REPO__ === "string"
    ? __JACH_UPDATE_GITHUB_REPO__
    : process.env.JACH_UPDATE_GITHUB_REPO
  )?.trim() ?? "";

export interface GithubUpdateFeed {
  owner: string;
  repo: string;
}

/**
 * Analyse `owner/repo` (ou une URL GitHub complète) et renvoie le dépôt.
 * Renvoie `null` si rien n'est configuré, lève si la valeur est mal formée :
 * une release ne doit jamais être cherchée sur un dépôt approximatif.
 */
export function parseGithubUpdateRepository(
  input: string = UPDATE_GITHUB_REPOSITORY,
): GithubUpdateFeed | null {
  const raw = input.trim();
  if (!raw) return null;

  let candidate = raw;
  if (/^https?:\/\//i.test(raw)) {
    const url = new URL(raw);
    if (url.hostname !== "github.com") {
      throw new Error(
        "Le dépôt de mise à jour doit être hébergé sur github.com.",
      );
    }
    candidate = url.pathname.replace(/^\/+|\/+$/g, "");
  }

  const segments = candidate
    .replace(/\.git$/i, "")
    .split("/")
    .filter(Boolean);
  if (segments.length !== 2) {
    throw new Error(
      "Le dépôt de mise à jour doit être au format « owner/repo ».",
    );
  }
  const [owner, repo] = segments;
  const NAME = /^[A-Za-z0-9._-]+$/;
  if (!NAME.test(owner) || !NAME.test(repo)) {
    throw new Error(
      "Le dépôt de mise à jour contient des caractères invalides.",
    );
  }
  return { owner, repo };
}

export function validateUpdateFeedUrl(input: string): string {
  if (!input.trim()) {
    throw new Error("Le canal signé de mise à jour n'est pas configuré.");
  }
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
