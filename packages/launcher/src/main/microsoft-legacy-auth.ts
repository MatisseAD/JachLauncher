import { BrowserWindow } from "electron";

/**
 * Authentification Microsoft « héritée » (endpoints login.live.com).
 *
 * Elle s'appuie sur l'identifiant public du launcher Minecraft officiel, déjà
 * autorisé par Mojang à appeler l'API Minecraft Services. Elle évite donc la
 * demande d'approbation nécessaire à une inscription Azure personnelle, qui
 * bloque l'accès à `api.minecraftservices.com` (HTTP 403).
 *
 * Le jeton obtenu est un jeton MSA hérité : il doit être transmis à Xbox Live
 * SANS le préfixe `d=` utilisé pour les jetons Azure AD.
 */
export const LEGACY_CLIENT_ID = "00000000402b5328";
export const LEGACY_REDIRECT_URI = "https://login.live.com/oauth20_desktop.srf";
export const LEGACY_SCOPE = "service::user.auth.xboxlive.com::MBI_SSL";
const AUTHORIZE_URL = "https://login.live.com/oauth20_authorize.srf";
const TOKEN_URL = "https://login.live.com/oauth20_token.srf";

export class LegacyAuthError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "LegacyAuthError";
  }
}

export interface LegacyTokenSet {
  accessToken: string;
  refreshToken?: string;
  /** Instant d'expiration (ms epoch). */
  expiresAt?: number;
}

type FetchLike = typeof fetch;

/** URL de la page de connexion Microsoft pour le flux hérité. */
export function buildLegacyAuthorizeUrl(prompt = "select_account"): string {
  const params = new URLSearchParams({
    client_id: LEGACY_CLIENT_ID,
    response_type: "code",
    redirect_uri: LEGACY_REDIRECT_URI,
    scope: LEGACY_SCOPE,
    prompt,
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

/**
 * Extrait le code d'autorisation d'une URL de redirection.
 * Renvoie `null` tant que l'URL n'est pas la redirection finale.
 */
export function extractLegacyAuthCode(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (`${url.origin}${url.pathname}` !== LEGACY_REDIRECT_URI) return null;

  const error = url.searchParams.get("error");
  if (error) {
    const description = url.searchParams.get("error_description") ?? "";
    if (/access_denied/i.test(error)) {
      throw new LegacyAuthError("MICROSOFT_LOGIN_CANCELLED");
    }
    throw new LegacyAuthError(`${error} ${description}`.trim());
  }

  return url.searchParams.get("code");
}

/** Échange le code d'autorisation contre un jeton MSA (client public, sans secret). */
export async function redeemLegacyAuthCode(
  code: string,
  options: { fetchImpl?: FetchLike; signal?: AbortSignal } = {},
): Promise<LegacyTokenSet> {
  return requestLegacyToken(
    {
      client_id: LEGACY_CLIENT_ID,
      redirect_uri: LEGACY_REDIRECT_URI,
      scope: LEGACY_SCOPE,
      grant_type: "authorization_code",
      code,
    },
    options,
  );
}

/** Renouvelle un jeton hérité à partir de son refresh token. */
export async function refreshLegacyToken(
  refreshToken: string,
  options: { fetchImpl?: FetchLike; signal?: AbortSignal } = {},
): Promise<LegacyTokenSet> {
  return requestLegacyToken(
    {
      client_id: LEGACY_CLIENT_ID,
      redirect_uri: LEGACY_REDIRECT_URI,
      scope: LEGACY_SCOPE,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    },
    options,
  );
}

async function requestLegacyToken(
  body: Record<string, string>,
  options: { fetchImpl?: FetchLike; signal?: AbortSignal },
): Promise<LegacyTokenSet> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
    signal: options.signal,
  });

  if (!response.ok) {
    // Aucun corps n'est propagé : il contient des jetons.
    throw new LegacyAuthError(
      "MICROSOFT_LEGACY_TOKEN_REFUSED",
      response.status,
    );
  }

  const payload: unknown = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    throw new LegacyAuthError("MICROSOFT_LEGACY_TOKEN_INVALID");
  }
  const record = payload as Record<string, unknown>;
  const accessToken =
    typeof record.access_token === "string" ? record.access_token : "";
  if (!accessToken) {
    throw new LegacyAuthError("MICROSOFT_LEGACY_TOKEN_INVALID");
  }

  return {
    accessToken,
    refreshToken:
      typeof record.refresh_token === "string"
        ? record.refresh_token
        : undefined,
    expiresAt:
      typeof record.expires_in === "number"
        ? Date.now() + record.expires_in * 1_000
        : undefined,
  };
}

/**
 * Ouvre la fenêtre de connexion Microsoft et attend la redirection finale.
 * La fenêtre est isolée (aucune intégration Node) et toujours détruite.
 */
export function requestLegacyAuthCode(options: {
  parent?: BrowserWindow | null;
  signal?: AbortSignal;
  onProgress?: (stage: string) => void;
}): Promise<string> {
  const { parent, signal, onProgress } = options;

  return new Promise<string>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new LegacyAuthError("MICROSOFT_LOGIN_CANCELLED"));
      return;
    }

    const window = new BrowserWindow({
      width: 520,
      height: 720,
      title: "Connexion Microsoft",
      autoHideMenuBar: true,
      parent: parent ?? undefined,
      modal: Boolean(parent),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: "persist:microsoft-legacy-auth",
      },
    });

    let settled = false;
    const finish = (error: Error | null, code?: string) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener("abort", onAbort);
      if (!window.isDestroyed()) window.destroy();
      if (error) reject(error);
      else resolve(code as string);
    };

    const onAbort = () =>
      finish(new LegacyAuthError("MICROSOFT_LOGIN_CANCELLED"));
    signal?.addEventListener("abort", onAbort, { once: true });

    // Toute navigation est inspectée : la redirection finale porte le code.
    const inspect = (url: string) => {
      try {
        const code = extractLegacyAuthCode(url);
        if (code) finish(null, code);
      } catch (error) {
        finish(
          error instanceof Error ? error : new LegacyAuthError(String(error)),
        );
      }
    };

    window.webContents.on("will-redirect", (_event, url) => inspect(url));
    window.webContents.on("did-navigate", (_event, url) => inspect(url));
    window.webContents.on("did-navigate-in-page", (_event, url) =>
      inspect(url),
    );
    window.on("closed", () =>
      finish(new LegacyAuthError("MICROSOFT_LOGIN_CANCELLED")),
    );

    onProgress?.("Ouverture de la connexion Microsoft…");
    void window.loadURL(buildLegacyAuthorizeUrl()).catch((error: unknown) => {
      finish(
        new LegacyAuthError(
          `MICROSOFT_NETWORK_ERROR ${error instanceof Error ? error.message : String(error)}`,
        ),
      );
    });
  });
}
