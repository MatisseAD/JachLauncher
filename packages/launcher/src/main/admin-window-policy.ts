import { ADMIN_CENTER_URL } from "./external-links";

const ADMIN_ORIGIN = new URL(ADMIN_CENTER_URL).origin;
const ALLOWED_ADMIN_PATHS = new Set(["/admin", "/login"]);

/** Pure allowlist used by Electron navigation hooks and regression tests. */
export function isAllowedAdminNavigation(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.origin !== ADMIN_ORIGIN || !ALLOWED_ADMIN_PATHS.has(url.pathname)) {
      return false;
    }
    if (url.username || url.password || url.hash) return false;
    if (url.pathname === "/login") {
      return (
        Array.from(url.searchParams.keys()).every((key) => key === "next") &&
        (!url.searchParams.has("next") ||
          url.searchParams.get("next") === "/admin")
      );
    }
    return url.pathname === "/admin" && url.search === "";
  } catch {
    return false;
  }
}

export function adminLoadErrorHtml(): string {
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><title>YourLauncher Admin indisponible</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0c11;color:#e8e4f5;font:15px system-ui}.card{max-width:470px;padding:32px;border:1px solid #292532;border-radius:16px;background:#121119;text-align:center;box-shadow:0 24px 70px #0008}h1{margin:0 0 9px;font-size:23px}p{margin:0 0 22px;color:#918c9f;line-height:1.55}a{display:inline-block;padding:10px 17px;border:1px solid #7457c7;border-radius:9px;background:#6042b5;color:white;text-decoration:none}</style><main class="card"><h1>Centre admin indisponible</h1><p>Vérifie ta connexion Internet puis réessaie. Aucun secret ni accès administrateur n'est stocké dans le launcher.</p><a href="${ADMIN_CENTER_URL}">Réessayer</a></main></html>`;
}
