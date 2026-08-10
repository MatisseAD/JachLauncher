import type { Account } from "../shared-types/ipc";
import type { MinecraftAuthorization } from "./auth";

/**
 * @xmcl/core@2.15 utilise `msa` par défaut lorsque userType est absent.
 * Son type public historique n'expose encore que `mojang | legacy` : il ne
 * faut donc surtout pas forcer `mojang` pour un jeton Microsoft moderne.
 */
export function xmclUserType(
  authorizationType: string | undefined,
): "legacy" | undefined {
  return authorizationType === "offline" ? "legacy" : undefined;
}

function normalizedUuid(value: string): string {
  return value.replaceAll("-", "").toLowerCase();
}

/** Défense en profondeur contre un compte UI et un jeton de jeu désynchronisés. */
export function authorizationMatchesAccount(
  authorization: MinecraftAuthorization | null,
  account: Account | null,
): boolean {
  if (!authorization || !account) return false;
  const expectedType = account.type === "microsoft" ? "msa" : "offline";
  return (
    authorization.meta?.type === expectedType &&
    normalizedUuid(authorization.uuid) === normalizedUuid(account.uuid) &&
    authorization.name === account.username
  );
}
