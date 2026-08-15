import crypto from "node:crypto";
import path from "node:path";
import type {
  AuthenticationResult,
  PublicClientApplication,
} from "@azure/msal-node";
import type { Account, AuthResult } from "../shared-types/ipc";
import {
  createAuthorizationCodePayload,
  createMicrosoftLoopbackCallback,
  createMicrosoftOAuthTransaction,
} from "./microsoft-oauth";
import { MicrosoftAuthLifecycle } from "./microsoft-auth-lifecycle";
import { exchangeMicrosoftTokenForMinecraft } from "./microsoft-xbox";
import {
  createEncryptedMsalCachePlugin,
  EncryptedTokenCacheStore,
  SecureTokenCacheError,
  type AsyncSecretProtector,
} from "./secure-token-cache";

declare const __JACH_AZURE_CLIENT_ID__: string | undefined;

const AZURE_CLIENT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BUNDLED_AZURE_CLIENT_ID =
  typeof __JACH_AZURE_CLIENT_ID__ === "string"
    ? __JACH_AZURE_CLIENT_ID__
    : undefined;
// `consumers` limite volontairement le sélecteur aux comptes Microsoft
// personnels (Xbox). Il doit rester cohérent avec le signInAudience de
// l'inscription Azure.
export const MICROSOFT_AUTHORITY =
  "https://login.microsoftonline.com/consumers";
export const MICROSOFT_SCOPES = ["XboxLive.signin", "offline_access"];
const MSAL_CACHE_FILENAME = "microsoft-msal-cache.bin";

/** Données d'autorisation adaptées aux options de lancement XMCL. */
export interface MinecraftAuthorization {
  access_token: string;
  client_token: string;
  uuid: string;
  name: string;
  user_properties: string;
  meta?: { type: string; demo?: boolean; exp?: number };
}

interface MicrosoftClient {
  application: PublicClientApplication;
  cacheStore: EncryptedTokenCacheStore;
}

interface AuthErrorShape {
  code?: unknown;
  errorCode?: unknown;
  subError?: unknown;
  ts?: unknown;
  message?: unknown;
  status?: unknown;
  response?: { status?: unknown };
}

// Les jetons de jeu restent uniquement en mémoire. Seul le cache MSAL est
// persisté et il est chiffré par safeStorage.
let currentAuth: MinecraftAuthorization | null = null;
const microsoftAuthLifecycle = new MicrosoftAuthLifecycle<AuthResult>();
let microsoftClientPromise: Promise<MicrosoftClient> | null = null;
let microsoftCacheStorePromise: Promise<EncryptedTokenCacheStore> | null = null;

/**
 * L'environnement reste prioritaire pour le développement. En production,
 * electron-vite remplace la constante par l'identifiant public validé au build.
 */
export function resolveAzureClientId(
  runtimeClientId: string | undefined = process.env.JACH_AZURE_CLIENT_ID,
  bundledClientId: string | undefined = BUNDLED_AZURE_CLIENT_ID,
  runtimeAlias: string | undefined = process.env.JACH_ID,
): string | null {
  const clientId =
    runtimeClientId?.trim() ||
    runtimeAlias?.trim() ||
    bundledClientId?.trim() ||
    "";
  if (!clientId) return null;
  if (!AZURE_CLIENT_ID_PATTERN.test(clientId)) {
    throw new Error(
      "JACH_AZURE_CLIENT_ID (ou JACH_ID) invalide : un identifiant d'application Azure au format GUID est attendu.",
    );
  }
  return clientId;
}

/**
 * UUID hors-ligne déterministe, identique à l'algorithme de Minecraft :
 * UUID.nameUUIDFromBytes("OfflinePlayer:<name>") => UUID v3 (MD5).
 */
export function offlineUuid(name: string): string {
  const md5 = crypto
    .createHash("md5")
    .update(`OfflinePlayer:${name}`, "utf8")
    .digest();
  md5[6] = (md5[6] & 0x0f) | 0x30;
  md5[8] = (md5[8] & 0x3f) | 0x80;
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
  return {
    ok: true,
    account: {
      type: "offline",
      username: name,
      uuid,
      avatarUrl: `https://mc-heads.net/avatar/${uuid}/64`,
    },
  };
}

/** Transforme les codes MSAL/Xbox/Minecraft en consignes sans donnée sensible. */
export function classifyMicrosoftAuthError(detail: string): string {
  if (
    /MICROSOFT_LOGIN_CANCELLED|error\.gui\.closed|callback.*cancel|access_denied|user_cancelled|annul/i.test(
      detail,
    )
  ) {
    return "Connexion Microsoft annulée.";
  }
  if (
    /callback.*timeout|MICROSOFT_SERVICE_TIMEOUT|temporisation|expir/i.test(
      detail,
    )
  ) {
    return "La connexion Microsoft a expiré. Vérifie Internet puis relance la connexion.";
  }
  if (/state_mismatch|état de sécurité|state mismatch/i.test(detail)) {
    return "La réponse Microsoft n'a pas passé le contrôle de sécurité. Ferme les anciens onglets de connexion puis réessaie.";
  }
  if (
    /encryption_unavailable|chiffrement sécurisé.*indisponible/i.test(detail)
  ) {
    return "La connexion Microsoft nécessite le coffre-fort chiffré de Windows, indisponible sur ce système. Redémarre ta session Windows puis réessaie.";
  }
  if (
    /cache_invalid|cache Microsoft.*(?:invalide|déverrouillé)/i.test(detail)
  ) {
    return "La session Microsoft enregistrée est illisible. Déconnecte le compte puis reconnecte-le.";
  }
  if (/MICROSOFT_MULTIPLE_ACCOUNTS/i.test(detail)) {
    return "Plusieurs sessions Microsoft incomplètes ont été retrouvées après un arrêt inattendu. Relance la connexion pour choisir le bon compte en toute sécurité.";
  }
  if (
    /AUTH_CONFIG_MISSING|JACH_(?:AZURE_CLIENT_)?ID|client ID.*GUID|format GUID/i.test(
      detail,
    )
  ) {
    return "Configuration Microsoft invalide : le client ID Azure public de cette version est absent ou mal formé.";
  }
  if (/\bAADSTS50011\b|reply url|redirect[_ ]uri|redirect URI/i.test(detail)) {
    return "Configuration Microsoft invalide : ajoute http://localhost aux URI de redirection « Applications mobiles et de bureau » dans Azure.";
  }
  if (/\bAADSTS7000112\b/i.test(detail)) {
    return "L'application Microsoft associée au client ID est désactivée (AADSTS7000112). L'administrateur doit la réactiver dans Microsoft Entra avant de réessayer.";
  }
  if (/\bAADSTS7000218\b/i.test(detail)) {
    return "Microsoft reconnaît le client ID, mais refuse le flux d'application de bureau publique (AADSTS7000218). Dans Azure, ajoute http://localhost sous « Applications mobiles et de bureau » ; si ce code persiste, vérifie aussi la configuration des flux de clients publics. Ce refus est distinct du type de compte choisi.";
  }
  if (
    /\bAADSTS700016\b|\bAADSTS700011\b|application (?:with identifier )?.*(?:not found|was not found)/i.test(
      detail,
    )
  ) {
    return "Configuration Microsoft invalide (AADSTS700016/invalid_client) : le client ID embarqué ne correspond pas à l'inscription Azure attendue ou n'est pas visible depuis l'autorité consumers.";
  }
  // `invalid_client` sans code AADSTS explicite : Microsoft reconnaît le client
  // ID mais refuse l'échange. Sur un client public de bureau, la cause quasi
  // systématique est la configuration de l'inscription (flux public désactivé
  // ou URI de redirection loopback absente), pas l'identifiant lui-même.
  if (/invalid[._ ]client/i.test(detail)) {
    return "Microsoft reconnaît le client ID mais refuse l'échange (invalid_client). Dans Azure : active « Allow public client flows » et ajoute http://localhost sous « Applications mobiles et de bureau ».";
  }
  if (/\bAADSTS50020\b/i.test(detail)) {
    return "Microsoft a refusé ce compte (AADSTS50020), une erreur qui peut avoir plusieurs causes. Vérifie que tu as choisi un compte Microsoft personnel, puis que l'audience de l'inscription autorise les comptes personnels et que le launcher utilise bien l'autorité consumers.";
  }
  if (
    /\bAADSTS50194\b|signInAudience|personal Microsoft accounts?.*(?:not supported|not allowed)|does not (?:accept|support|allow).*(?:personal|consumer)/i.test(
      detail,
    )
  ) {
    return "L'endpoint Microsoft ne correspond pas au type d'inscription (AADSTS50194). Pour Xbox, conserve « Comptes Microsoft personnels uniquement » avec l'autorité consumers.";
  }
  if (/\bunauthorized_client\b/i.test(detail)) {
    return "Microsoft OAuth a refusé l'application (unauthorized_client), sans préciser quelle partie de l'inscription est en cause. Réessaie puis, si le refus persiste, contacte l'administrateur du launcher.";
  }
  if (/error\.auth\.xsts\.userNotFound|2148916233/i.test(detail)) {
    return "Ce compte Microsoft n'a pas encore de profil Xbox. Connecte-toi une fois sur xbox.com, crée ton gamertag puis réessaie.";
  }
  if (/error\.auth\.xsts\.bannedCountry|2148916235/i.test(detail)) {
    return "Xbox Live n'est pas disponible pour le pays associé à ce compte Microsoft.";
  }
  if (/error\.auth\.xsts\.child|214891623[678]/i.test(detail)) {
    return "Ce compte enfant doit être ajouté à une famille Microsoft et autorisé par un adulte avant de pouvoir utiliser Xbox Live.";
  }
  if (/MINECRAFT_JAVA_PROFILE_MISSING/i.test(detail)) {
    return "La licence Java existe, mais aucun profil Minecraft n'est initialisé. Choisis d'abord un pseudo sur minecraft.net puis réessaie.";
  }
  if (/\bMINECRAFT_JAVA_LICENSE_MISSING\b/i.test(detail)) {
    return "Aucune licence Minecraft: Java Edition utilisable n'a été trouvée sur ce compte.";
  }
  if (
    /error\.auth\.minecraft\.entitlements|MINECRAFT_ENTITLEMENTS_(?:INVALID_RESPONSE|RESPONSE_TOO_LARGE)/i.test(
      detail,
    )
  ) {
    if (/\bHTTP\s+(?:408|425|429|5\d{2})\b/i.test(detail)) {
      return "Le service Minecraft de vérification des licences est temporairement indisponible. Réessaie plus tard ; les droits du compte n'ont pas pu être déterminés.";
    }
    return "Minecraft n'a pas pu vérifier la licence auprès de son service. Reconnecte le compte puis réessaie ; les droits du compte n'ont pas pu être déterminés.";
  }
  if (/error\.auth\.xboxLive|error\.auth\.xsts/i.test(detail)) {
    return "Xbox Live a refusé la connexion. Vérifie le profil Xbox et les autorisations familiales du compte.";
  }
  if (/MINECRAFT_APP_REGISTRATION_NOT_APPROVED/i.test(detail)) {
    return "Microsoft et Xbox ont accepté le compte, mais ce client ID Azure n'est pas encore autorisé par Mojang pour les API Minecraft Java. Demande son ajout sur https://aka.ms/mce-reviewappid puis réessaie.";
  }
  if (/interaction_required|consent_required|login_required/i.test(detail)) {
    return "La session Microsoft doit être renouvelée. Relance la connexion et valide la demande dans le navigateur.";
  }
  if (
    /MICROSOFT_NETWORK_ERROR|network|fetch failed|ENOTFOUND|ECONN/i.test(detail)
  ) {
    return "Les services Microsoft, Xbox ou Minecraft sont injoignables. Vérifie Internet, le pare-feu et l'heure de Windows, puis réessaie.";
  }
  if (
    /error\.auth\.microsoft|\bAADSTS\d{5,8}\b|oauth|invalid_grant/i.test(detail)
  ) {
    return "Microsoft a refusé la connexion. Relance-la dans le navigateur et, si le problème persiste, contacte l'administrateur du launcher.";
  }
  return "La connexion Microsoft a échoué. Vérifie Internet, le profil Xbox et la licence Minecraft: Java Edition, puis réessaie.";
}

/**
 * Détail technique brut (déjà expurgé) de l'erreur Microsoft. Il n'est jamais
 * affiché à l'utilisateur : il sert uniquement au journal local, sans quoi le
 * vrai code AADSTS reste invisible pour diagnostiquer une inscription Azure.
 */
export function collectMicrosoftAuthDetail(error: unknown): string {
  const shape =
    typeof error === "object" && error !== null
      ? (error as AuthErrorShape)
      : undefined;
  return [
    typeof error === "string" ? error : "",
    typeof shape?.code === "string" ? shape.code : "",
    typeof shape?.errorCode === "string" ? shape.errorCode : "",
    typeof shape?.subError === "string" ? shape.subError : "",
    typeof shape?.ts === "string" ? shape.ts : "",
    typeof shape?.message === "string" ? shape.message.slice(0, 1_000) : "",
    typeof shape?.status === "number" ? `HTTP ${shape.status}` : "",
    typeof shape?.response?.status === "number"
      ? `HTTP ${shape.response.status}`
      : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function describeMicrosoftAuthError(error: unknown): string {
  // Aucun corps HTTP, URL de callback, code ou jeton n'est propagé au renderer.
  return classifyMicrosoftAuthError(collectMicrosoftAuthDetail(error));
}

export function assertSafeMicrosoftAuthorizationUrl(value: string): string {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "login.microsoftonline.com" ||
    !/^\/consumers\/oauth2\/v2\.0\/authorize\/?$/i.test(url.pathname)
  ) {
    throw new Error("MICROSOFT_AUTHORIZATION_URL_REJECTED");
  }
  return url.toString();
}

async function getMicrosoftCacheStore(): Promise<EncryptedTokenCacheStore> {
  if (microsoftCacheStorePromise) return microsoftCacheStorePromise;
  microsoftCacheStorePromise = (async () => {
    const { app, safeStorage } = await import("electron");
    if (!app.isReady()) {
      throw new Error("Le stockage Microsoft est initialisé avant Electron.");
    }
    const protector: AsyncSecretProtector = {
      isAvailable: () => safeStorage.isAsyncEncryptionAvailable(),
      encrypt: (plainText) => safeStorage.encryptStringAsync(plainText),
      async decrypt(encrypted) {
        const decrypted = await safeStorage.decryptStringAsync(encrypted);
        return {
          result: decrypted.result,
          shouldReEncrypt: decrypted.shouldReEncrypt,
        };
      },
    };
    return new EncryptedTokenCacheStore(
      path.join(app.getPath("userData"), MSAL_CACHE_FILENAME),
      protector,
    );
  })().catch((error: unknown) => {
    microsoftCacheStorePromise = null;
    throw error;
  });
  return microsoftCacheStorePromise;
}

async function getMicrosoftClient(): Promise<MicrosoftClient> {
  if (microsoftClientPromise) return microsoftClientPromise;
  microsoftClientPromise = (async () => {
    const clientId = resolveAzureClientId();
    if (!clientId) throw new Error("AUTH_CONFIG_MISSING");
    const [{ PublicClientApplication, LogLevel }, cacheStore] =
      await Promise.all([import("@azure/msal-node"), getMicrosoftCacheStore()]);
    const application = new PublicClientApplication({
      auth: {
        clientId,
        authority: MICROSOFT_AUTHORITY,
      },
      cache: {
        cachePlugin: createEncryptedMsalCachePlugin(cacheStore),
      },
      system: {
        loggerOptions: {
          logLevel: LogLevel.Error,
          piiLoggingEnabled: false,
          // On ne journalise pas MSAL : les diagnostics utilisateurs sont
          // classés plus bas sans URL, code, compte ni jeton.
          loggerCallback: () => undefined,
        },
      },
    });
    return { application, cacheStore };
  })().catch((error: unknown) => {
    microsoftClientPromise = null;
    throw error;
  });
  return microsoftClientPromise;
}

async function acquireInteractiveToken(
  application: PublicClientApplication,
  signal: AbortSignal,
  onProgress?: (stage: string) => void,
): Promise<AuthenticationResult> {
  const transaction = createMicrosoftOAuthTransaction();
  const callback = await createMicrosoftLoopbackCallback({
    expectedState: transaction.state,
    signal,
  });
  try {
    const scopes = [...MICROSOFT_SCOPES];
    const authorizationUrl = assertSafeMicrosoftAuthorizationUrl(
      await application.getAuthCodeUrl({
        scopes,
        redirectUri: callback.redirectUri,
        responseMode: "query",
        state: transaction.state,
        nonce: transaction.nonce,
        prompt: "select_account",
        codeChallenge: transaction.challenge,
        codeChallengeMethod: "S256",
      }),
    );
    if (signal.aborted) throw new Error("MICROSOFT_LOGIN_CANCELLED");

    onProgress?.("Navigateur système ouvert — termine la connexion Microsoft…");
    const { shell } = await import("electron");
    await shell.openExternal(authorizationUrl);
    const code = await callback.waitForCode;
    if (signal.aborted) throw new Error("MICROSOFT_LOGIN_CANCELLED");

    onProgress?.("Validation sécurisée de la réponse Microsoft…");
    return application.acquireTokenByCode(
      {
        code,
        scopes,
        redirectUri: callback.redirectUri,
        state: transaction.state,
        codeVerifier: transaction.verifier,
      },
      createAuthorizationCodePayload(code, transaction),
    );
  } finally {
    await callback.close();
  }
}

export function microsoftAuthorizationToAccount(
  authorization: MinecraftAuthorization,
): Account {
  return {
    type: "microsoft",
    username: authorization.name,
    uuid: authorization.uuid,
    avatarUrl: `https://mc-heads.net/avatar/${authorization.uuid}/64`,
  };
}

async function useMicrosoftToken(
  result: AuthenticationResult,
  signal: AbortSignal | undefined,
  onProgress?: (stage: string) => void,
  shouldCommit: () => boolean = () => true,
): Promise<AuthResult> {
  if (!result.accessToken) throw new Error("MICROSOFT_ACCESS_TOKEN_MISSING");
  const authorization = await exchangeMicrosoftTokenForMinecraft(
    result.accessToken,
    { signal, onProgress },
  );
  if (!canCommitMicrosoftAuthorization(signal, shouldCommit)) {
    return { ok: false, error: "Connexion Microsoft annulée." };
  }
  currentAuth = authorization;
  return {
    ok: true,
    account: microsoftAuthorizationToAccount(authorization),
  };
}

type MicrosoftMsalAccount = NonNullable<AuthenticationResult["account"]>;

/**
 * Une restauration silencieuse n'a aucun écran permettant de choisir un compte.
 * Après un crash au milieu d'un changement de compte, MSAL peut brièvement
 * contenir A et B : en choisir un selon l'ordre du cache serait non déterministe.
 */
export function selectUnambiguousMicrosoftAccount<T>(
  accounts: readonly T[],
): T | null {
  if (accounts.length === 0) return null;
  if (accounts.length !== 1) throw new Error("MICROSOFT_MULTIPLE_ACCOUNTS");
  return accounts[0];
}

/**
 * MSAL Node fusionne `deserialize` avec certaines entrées déjà en mémoire.
 * Après un rollback, on restaure donc d'abord le snapshot chiffré puis on
 * abandonne entièrement l'instance MSAL devenue sale. Même si l'écriture
 * échoue, cette instance ne doit jamais être réutilisée.
 */
export async function restoreMicrosoftCacheSnapshot(
  snapshot: string,
  saveSnapshot: (value: string) => Promise<void>,
  discardClient: () => void,
): Promise<void> {
  try {
    await saveSnapshot(snapshot);
  } finally {
    discardClient();
  }
}

interface MicrosoftAccountSwitchTransaction {
  signal: AbortSignal;
  loadAccounts: () => Promise<MicrosoftMsalAccount[]>;
  serializeCache: () => string;
  restoreCache: (snapshot: string) => Promise<void>;
  acquireToken: () => Promise<AuthenticationResult>;
  exchangeToken: (
    result: AuthenticationResult,
  ) => Promise<MinecraftAuthorization>;
  removeAccount: (account: MicrosoftMsalAccount) => Promise<void>;
  commitAuthorization: (authorization: MinecraftAuthorization) => void;
}

/**
 * Bascule de compte en deux phases : l'échange Minecraft est terminé avant de
 * toucher à l'ancien compte MSAL. En cas d'échec ou d'annulation, le snapshot
 * pré-login est restauré dans le stockage chiffré et l'instance MSAL sale est
 * abandonnée. La persistance MSAL n'offre pas de transaction native ; ce
 * snapshot et l'écriture atomique du store constituent donc le rollback le
 * plus strict disponible.
 */
export async function runMicrosoftAccountSwitchTransaction(
  transaction: MicrosoftAccountSwitchTransaction,
): Promise<AuthResult> {
  // getAllAccounts hydrate d'abord le cache via le plugin MSAL. Sans cela, le
  // snapshot pourrait être vide alors qu'un compte A existe bien sur disque.
  await transaction.loadAccounts();
  const cacheSnapshot = transaction.serializeCache();

  try {
    const result = await transaction.acquireToken();
    if (!result.account) throw new Error("MICROSOFT_ACCOUNT_MISSING");
    if (!result.accessToken) {
      throw new Error("MICROSOFT_ACCESS_TOKEN_MISSING");
    }
    if (transaction.signal.aborted) {
      throw new Error("MICROSOFT_LOGIN_CANCELLED");
    }

    const authorization = await transaction.exchangeToken(result);
    if (transaction.signal.aborted) {
      throw new Error("MICROSOFT_LOGIN_CANCELLED");
    }

    // Phase de commit. Si une suppression échoue ou si une annulation arrive
    // pendant une opération MSAL, le catch restaure le snapshot complet.
    const selectedAccountId = result.account.homeAccountId;
    const accounts = await transaction.loadAccounts();
    for (const account of accounts) {
      if (transaction.signal.aborted) {
        throw new Error("MICROSOFT_LOGIN_CANCELLED");
      }
      if (account.homeAccountId !== selectedAccountId) {
        await transaction.removeAccount(account);
      }
    }
    if (transaction.signal.aborted) {
      throw new Error("MICROSOFT_LOGIN_CANCELLED");
    }

    // Aucun await entre le dernier contrôle d'annulation et le commit mémoire :
    // currentAuth et le cache final deviennent observables ensemble.
    transaction.commitAuthorization(authorization);
    return {
      ok: true,
      account: microsoftAuthorizationToAccount(authorization),
    };
  } catch (error) {
    try {
      await transaction.restoreCache(cacheSnapshot);
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        "MICROSOFT_LOGIN_ROLLBACK_FAILED",
        { cause: rollbackError },
      );
    }
    throw error;
  }
}

export function canCommitMicrosoftAuthorization(
  signal: AbortSignal | undefined,
  shouldCommit: () => boolean,
): boolean {
  return !signal?.aborted && shouldCommit();
}

async function performMicrosoftLogin(
  signal: AbortSignal,
  onProgress?: (stage: string) => void,
): Promise<AuthResult> {
  try {
    const { application, cacheStore } = await getMicrosoftClient();
    // Préflight explicite : jamais de connexion si le cache ne peut pas être
    // chiffré/déchiffré par le coffre-fort natif.
    await prepareMicrosoftCacheForInteractiveLogin(cacheStore);
    const tokenCache = application.getTokenCache();
    return await runMicrosoftAccountSwitchTransaction({
      signal,
      loadAccounts: () => application.getAllAccounts(),
      serializeCache: () => tokenCache.serialize(),
      async restoreCache(snapshot) {
        await restoreMicrosoftCacheSnapshot(
          snapshot,
          (value) => cacheStore.save(value),
          () => {
            microsoftClientPromise = null;
          },
        );
      },
      acquireToken: () =>
        acquireInteractiveToken(application, signal, onProgress),
      async exchangeToken(result) {
        return exchangeMicrosoftTokenForMinecraft(result.accessToken, {
          signal,
          onProgress,
        });
      },
      removeAccount: (account) => tokenCache.removeAccount(account),
      commitAuthorization(authorization) {
        currentAuth = authorization;
      },
    });
  } catch (error) {
    // Journalise le code exact renvoyé par Microsoft : le message affiché est
    // volontairement pédagogique et masque le code technique.
    onProgress?.(`diagnostic brut : ${collectMicrosoftAuthDetail(error)}`);
    return { ok: false, error: describeMicrosoftAuthError(error) };
  }
}

export function isRecoverableMicrosoftCacheError(error: unknown): boolean {
  return (
    error instanceof SecureTokenCacheError &&
    (error.code === "cache_invalid" || error.code === "cache_io")
  );
}

export async function prepareMicrosoftCacheForInteractiveLogin(
  cacheStore: Pick<EncryptedTokenCacheStore, "load" | "clear">,
): Promise<"ready" | "reset"> {
  try {
    await cacheStore.load();
    return "ready";
  } catch (error) {
    if (!isRecoverableMicrosoftCacheError(error)) throw error;
    // Un cache illisible ne contient plus de session utilisable. On supprime
    // uniquement ce fichier chiffré avant le nouveau flux OAuth ; une panne du
    // coffre-fort, elle, n'est jamais contournée par un stockage en clair.
    await cacheStore.clear();
    return "reset";
  }
}

/** Une seule connexion interactive peut être active à la fois. */
export function loginMicrosoft(
  onProgress?: (stage: string) => void,
): Promise<AuthResult> {
  return microsoftAuthLifecycle.runLogin((signal) =>
    performMicrosoftLogin(signal, onProgress),
  );
}

export function cancelMicrosoftLogin(): boolean {
  return microsoftAuthLifecycle.cancelLogin();
}

/** Restaure silencieusement le dernier compte via le refresh token MSAL chiffré. */
async function performMicrosoftRestore(
  signal: AbortSignal,
  onProgress: ((stage: string) => void) | undefined,
  shouldCommit: () => boolean,
): Promise<AuthResult> {
  try {
    const { application } = await getMicrosoftClient();
    const accounts = await application.getAllAccounts();
    const account = selectUnambiguousMicrosoftAccount(accounts);
    if (!account) {
      return { ok: false, error: "Aucune session Microsoft enregistrée." };
    }
    onProgress?.("Restauration sécurisée de la session Microsoft…");
    const result = await application.acquireTokenSilent({
      account,
      scopes: [...MICROSOFT_SCOPES],
    });
    return await useMicrosoftToken(result, signal, onProgress, shouldCommit);
  } catch (error) {
    return { ok: false, error: describeMicrosoftAuthError(error) };
  }
}

export function restoreMicrosoftAccount(
  onProgress?: (stage: string) => void,
  shouldCommit: () => boolean = () => true,
): Promise<AuthResult> {
  return microsoftAuthLifecycle.runRestore((signal) =>
    performMicrosoftRestore(signal, onProgress, shouldCommit),
  );
}

export function isMinecraftAuthorizationFresh(
  authorization: MinecraftAuthorization | null,
  now = Date.now(),
): boolean {
  return Boolean(
    authorization?.meta?.type === "msa" &&
    authorization.meta.exp &&
    authorization.meta.exp > now + 5 * 60 * 1_000,
  );
}

/** Rafraîchit silencieusement le jeton de jeu lorsqu'il approche de l'expiration. */
export function ensureMicrosoftAuthorizationFresh(
  onProgress?: (stage: string) => void,
  shouldCommit: () => boolean = () => true,
): Promise<AuthResult> {
  if (isMinecraftAuthorizationFresh(currentAuth)) {
    return Promise.resolve({
      ok: true,
      account: microsoftAuthorizationToAccount(
        currentAuth as MinecraftAuthorization,
      ),
    });
  }
  return restoreMicrosoftAccount(onProgress, shouldCommit);
}

/** Recharge une autorisation hors-ligne depuis un compte persistant. */
export function rehydrateOffline(account: Account): void {
  if (account.type === "offline") {
    const result = setOfflineAccount(account.username);
    if (!result.ok) currentAuth = null;
  }
}

export function getCurrentAuth(): MinecraftAuthorization | null {
  return currentAuth;
}

export function clearAuth(): void {
  currentAuth = null;
}

/** Supprime les comptes MSAL en mémoire puis le fichier chiffré sur disque. */
export async function clearMicrosoftSession(): Promise<void> {
  await microsoftAuthLifecycle.runExclusiveClear(async () => {
    const cacheStore = await getMicrosoftCacheStore();
    if (microsoftClientPromise) {
      try {
        const { application } = await microsoftClientPromise;
        const accounts = await application.getAllAccounts();
        for (const account of accounts) {
          await application.getTokenCache().removeAccount(account);
        }
      } catch {
        // Le fichier est tout de même supprimé ci-dessous si MSAL ne démarre pas.
      }
    }
    await cacheStore.clear();
    currentAuth = null;
    microsoftClientPromise = null;
  });
}
