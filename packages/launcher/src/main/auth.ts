import crypto from "node:crypto";
import type { Account, AuthResult } from "../shared-types/ipc";

/**
 * Objet d'autorisation au format attendu par minecraft-launcher-core.
 * (access_token "0" => mode hors-ligne accepté par MCLC.)
 */
export interface MclcAuthorization {
  access_token: string;
  client_token: string;
  uuid: string;
  name: string;
  user_properties: string;
  meta?: { type: string; demo?: boolean };
}

// Autorisation courante en mémoire (jamais persistée : contient des tokens).
let currentAuth: MclcAuthorization | null = null;

/**
 * UUID hors-ligne déterministe, identique à l'algorithme de Minecraft :
 * UUID.nameUUIDFromBytes("OfflinePlayer:<name>") => UUID v3 (MD5).
 */
export function offlineUuid(name: string): string {
  const md5 = crypto.createHash("md5").update(`OfflinePlayer:${name}`, "utf8").digest();
  md5[6] = (md5[6] & 0x0f) | 0x30; // version 3
  md5[8] = (md5[8] & 0x3f) | 0x80; // variante RFC 4122
  const hex = md5.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function setOfflineAccount(username: string): AuthResult {
  const name = username.trim();
  if (!/^[a-zA-Z0-9_]{3,16}$/.test(name)) {
    return { ok: false, error: "Pseudo invalide (3-16 car., a-z A-Z 0-9 _)" };
  }
  const uuid = offlineUuid(name);
  currentAuth = {
    access_token: "0",
    client_token: crypto.randomUUID(),
    uuid,
    name,
    user_properties: "{}",
    meta: { type: "offline", demo: false },
  };
  const account: Account = {
    type: "offline",
    username: name,
    uuid,
    avatarUrl: `https://mc-heads.net/avatar/${uuid}/64`,
  };
  return { ok: true, account };
}

/**
 * Authentification Microsoft via msmc (chargé dynamiquement car ESM).
 * Nécessite Electron (ouvre une fenêtre de connexion) et, en production,
 * un client ID Azure valide autorisé pour l'API Minecraft.
 */
export async function loginMicrosoft(): Promise<AuthResult> {
  try {
    // Import dynamique : msmc est un module ESM, on évite un require() CJS.
    const msmc: any = await import("msmc");
    const Auth = msmc.Auth ?? msmc.default?.Auth;
    if (!Auth) return { ok: false, error: "msmc indisponible" };

    const clientId = process.env.JACH_AZURE_CLIENT_ID;
    const authManager = clientId ? new Auth("select_account", { client_id: clientId }) : new Auth("select_account");

    const xbox = await authManager.launch("electron");
    const mc = await xbox.getMinecraft();
    const mclc: MclcAuthorization = mc.mclc();
    currentAuth = mclc;

    const account: Account = {
      type: "microsoft",
      username: mclc.name,
      uuid: mclc.uuid,
      avatarUrl: `https://mc-heads.net/avatar/${mclc.uuid}/64`,
    };
    return { ok: true, account };
  } catch (e) {
    return {
      ok: false,
      error:
        "Échec de la connexion Microsoft. Configure un client ID Azure (JACH_AZURE_CLIENT_ID) ou utilise le mode hors-ligne. Détail : " +
        String(e),
    };
  }
}

/** Recharge une autorisation hors-ligne depuis un compte persistant. */
export function rehydrateOffline(account: Account): void {
  if (account.type === "offline") {
    const r = setOfflineAccount(account.username);
    if (!r.ok) currentAuth = null;
  }
}

export function getCurrentAuth(): MclcAuthorization | null {
  return currentAuth;
}

export function clearAuth(): void {
  currentAuth = null;
}
