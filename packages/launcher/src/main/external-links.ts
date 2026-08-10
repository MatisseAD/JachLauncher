export const ADMIN_CENTER_URL = "https://yourlauncher.vercel.app/admin";

/** Garde-fou de régression : le renderer ne fournit jamais cette URL. */
export function assertFixedAdminCenterUrl(value: string): string {
  const parsed = new URL(value);
  if (
    parsed.protocol !== "https:" ||
    parsed.origin !== "https://yourlauncher.vercel.app" ||
    parsed.pathname !== "/admin" ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("ADMIN_CENTER_URL_INVALID");
  }
  return parsed.toString();
}
