import type { Account } from "../shared-types/ipc";

const MINECRAFT_UUID_PATTERN =
  /^(?:[0-9a-f]{32}|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

/** Ne conserve que les métadonnées d'affichage, jamais un jeton persistant. */
export function sanitizeStoredAccount(input: unknown): Account | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  if (value.type !== "offline" && value.type !== "microsoft") return null;
  if (
    typeof value.username !== "string" ||
    !(value.type === "offline"
      ? /^[a-zA-Z0-9_]{3,16}$/.test(value.username)
      : /^[a-zA-Z0-9_]{1,16}$/.test(value.username)) ||
    typeof value.uuid !== "string" ||
    !MINECRAFT_UUID_PATTERN.test(value.uuid)
  ) {
    return null;
  }
  return {
    type: value.type,
    username: value.username,
    uuid: value.uuid,
    avatarUrl: `https://mc-heads.net/avatar/${value.uuid}/64`,
  };
}
