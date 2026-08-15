import crypto from "node:crypto";
import { z } from "zod";
import type { MinecraftAuthorization } from "./auth";
import {
  readResponseTextBounded,
  ResponseBodyTooLargeError,
} from "./bounded-response";

const REQUEST_TIMEOUT_MS = 20_000;
const MAX_RESPONSE_BYTES = 1_024 * 1_024;

const XboxTokenSchema = z.object({
  Token: z.string().min(1).max(16_384),
});

const XstsTokenSchema = z.object({
  Token: z.string().min(1).max(16_384),
  DisplayClaims: z.object({
    xui: z.array(z.object({ uhs: z.string().min(1).max(256) })).min(1),
  }),
});

const MinecraftTokenSchema = z.object({
  access_token: z.string().min(1).max(32_768),
  expires_in: z
    .number()
    .int()
    .positive()
    .max(7 * 24 * 60 * 60),
});

const EntitlementsSchema = z.object({
  items: z.array(z.object({ name: z.string().min(1).max(128) })),
});

const MinecraftProfileSchema = z.object({
  id: z.string().regex(/^[0-9a-f]{32}$/i),
  name: z.string().regex(/^[a-zA-Z0-9_]{1,16}$/),
});

export class MicrosoftServicesError extends Error {
  constructor(
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(status ? `${code} (HTTP ${status})` : code);
    this.name = "MicrosoftServicesError";
  }
}

type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

async function requestJson(
  fetchImpl: FetchLike,
  url: string,
  init: RequestInit,
  code: string,
  signal?: AbortSignal,
): Promise<{ ok: boolean; status: number; payload: unknown }> {
  if (signal?.aborted) {
    throw new MicrosoftServicesError("MICROSOFT_LOGIN_CANCELLED");
  }
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  timeout.unref();
  try {
    const response = await fetchImpl(url, {
      ...init,
      signal: controller.signal,
    });
    const payload = await readJson(response, code);
    return { ok: response.ok, status: response.status, payload };
  } catch (error) {
    if (error instanceof MicrosoftServicesError) throw error;
    if (signal?.aborted) {
      throw new MicrosoftServicesError("MICROSOFT_LOGIN_CANCELLED");
    }
    if (controller.signal.aborted) {
      throw new MicrosoftServicesError("MICROSOFT_SERVICE_TIMEOUT");
    }
    throw new MicrosoftServicesError("MICROSOFT_NETWORK_ERROR");
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", onAbort);
  }
}

async function readJson(response: Response, code: string): Promise<unknown> {
  let text: string;
  try {
    text = await readResponseTextBounded(response, MAX_RESPONSE_BYTES);
  } catch (error) {
    if (error instanceof ResponseBodyTooLargeError) {
      throw new MicrosoftServicesError(
        `${code}_RESPONSE_TOO_LARGE`,
        response.status,
      );
    }
    throw error;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new MicrosoftServicesError(
      `${code}_INVALID_RESPONSE`,
      response.status,
    );
  }
}

function jsonRequest(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}

function xboxJsonRequest(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-xbl-contract-version": "1",
    },
    body: JSON.stringify(body),
  };
}

function bearerRequest(token: string): RequestInit {
  return {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  };
}

function xstsErrorCode(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("XErr" in payload)) {
    return null;
  }
  const xerr = Number(payload.XErr);
  switch (xerr) {
    case 2148916233:
      return "error.auth.xsts.userNotFound";
    case 2148916235:
      return "error.auth.xsts.bannedCountry";
    case 2148916236:
    case 2148916237:
    case 2148916238:
      return "error.auth.xsts.child";
    default:
      return Number.isFinite(xerr) ? `error.auth.xsts.${xerr}` : null;
  }
}

function isUnapprovedMinecraftApp(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const errorMessage =
    "errorMessage" in payload && typeof payload.errorMessage === "string"
      ? payload.errorMessage
      : "";
  return /invalid app registration|aka\.ms\/AppRegInfo/i.test(errorMessage);
}

/**
 * Échanges REST Xbox/XSTS/Minecraft. Les jetons ne quittent jamais ce module,
 * ne sont inclus dans aucune erreur et ne sont jamais journalisés.
 */
export async function exchangeMicrosoftTokenForMinecraft(
  microsoftAccessToken: string,
  options: {
    signal?: AbortSignal;
    onProgress?: (stage: string) => void;
    fetchImpl?: FetchLike;
    /**
     * Préfixe du RpsTicket Xbox. Les jetons Azure AD (MSAL) exigent `d=`,
     * tandis que les jetons MSA hérités (login.live.com) doivent être envoyés
     * bruts. Voir microsoft-legacy-auth.ts.
     */
    rpsTicketPrefix?: string;
  } = {},
): Promise<MinecraftAuthorization> {
  if (!microsoftAccessToken) {
    throw new MicrosoftServicesError("MICROSOFT_ACCESS_TOKEN_MISSING");
  }
  const fetchImpl = options.fetchImpl ?? fetch;

  options.onProgress?.("Authentification Xbox Live…");
  const xboxResponse = await requestJson(
    fetchImpl,
    "https://user.auth.xboxlive.com/user/authenticate",
    xboxJsonRequest({
      Properties: {
        AuthMethod: "RPS",
        SiteName: "user.auth.xboxlive.com",
        RpsTicket: `${options.rpsTicketPrefix ?? "d="}${microsoftAccessToken}`,
      },
      RelyingParty: "http://auth.xboxlive.com",
      TokenType: "JWT",
    }),
    "XBOX_AUTH",
    options.signal,
  );
  if (!xboxResponse.ok) {
    throw new MicrosoftServicesError(
      "error.auth.xboxLive",
      xboxResponse.status,
    );
  }
  const xbox = XboxTokenSchema.safeParse(xboxResponse.payload);
  if (!xbox.success) {
    throw new MicrosoftServicesError("XBOX_AUTH_INVALID_RESPONSE");
  }

  options.onProgress?.("Validation du compte Xbox…");
  const xstsResponse = await requestJson(
    fetchImpl,
    "https://xsts.auth.xboxlive.com/xsts/authorize",
    xboxJsonRequest({
      Properties: { SandboxId: "RETAIL", UserTokens: [xbox.data.Token] },
      RelyingParty: "rp://api.minecraftservices.com/",
      TokenType: "JWT",
    }),
    "XSTS_AUTH",
    options.signal,
  );
  const specificXstsError = xstsErrorCode(xstsResponse.payload);
  if (specificXstsError) {
    throw new MicrosoftServicesError(specificXstsError, xstsResponse.status);
  }
  if (!xstsResponse.ok) {
    throw new MicrosoftServicesError("error.auth.xsts", xstsResponse.status);
  }
  const xsts = XstsTokenSchema.safeParse(xstsResponse.payload);
  if (!xsts.success) {
    throw new MicrosoftServicesError("XSTS_AUTH_INVALID_RESPONSE");
  }

  options.onProgress?.("Connexion aux services Minecraft…");
  const minecraftLoginResponse = await requestJson(
    fetchImpl,
    "https://api.minecraftservices.com/authentication/login_with_xbox",
    jsonRequest({
      identityToken: `XBL3.0 x=${xsts.data.DisplayClaims.xui[0].uhs};${xsts.data.Token}`,
    }),
    "MINECRAFT_LOGIN",
    options.signal,
  );
  if (!minecraftLoginResponse.ok) {
    if (
      minecraftLoginResponse.status === 403 &&
      isUnapprovedMinecraftApp(minecraftLoginResponse.payload)
    ) {
      throw new MicrosoftServicesError(
        "MINECRAFT_APP_REGISTRATION_NOT_APPROVED",
        minecraftLoginResponse.status,
      );
    }
    throw new MicrosoftServicesError(
      "error.auth.minecraft.login",
      minecraftLoginResponse.status,
    );
  }
  const minecraftToken = MinecraftTokenSchema.safeParse(
    minecraftLoginResponse.payload,
  );
  if (!minecraftToken.success) {
    throw new MicrosoftServicesError("MINECRAFT_LOGIN_INVALID_RESPONSE");
  }

  options.onProgress?.("Vérification de la licence Minecraft Java…");
  const entitlementsResponse = await requestJson(
    fetchImpl,
    "https://api.minecraftservices.com/entitlements/mcstore",
    bearerRequest(minecraftToken.data.access_token),
    "MINECRAFT_ENTITLEMENTS",
    options.signal,
  );
  if (!entitlementsResponse.ok) {
    throw new MicrosoftServicesError(
      "error.auth.minecraft.entitlements",
      entitlementsResponse.status,
    );
  }
  const entitlements = EntitlementsSchema.safeParse(
    entitlementsResponse.payload,
  );
  if (!entitlements.success) {
    throw new MicrosoftServicesError("MINECRAFT_ENTITLEMENTS_INVALID_RESPONSE");
  }
  const ownsJava = entitlements.data.items.some((item) =>
    ["game_minecraft", "product_minecraft"].includes(item.name),
  );
  if (!ownsJava) {
    throw new MicrosoftServicesError("MINECRAFT_JAVA_LICENSE_MISSING");
  }

  options.onProgress?.("Chargement du profil Minecraft…");
  const profileResponse = await requestJson(
    fetchImpl,
    "https://api.minecraftservices.com/minecraft/profile",
    bearerRequest(minecraftToken.data.access_token),
    "MINECRAFT_PROFILE",
    options.signal,
  );
  if (!profileResponse.ok) {
    throw new MicrosoftServicesError(
      profileResponse.status === 404
        ? "MINECRAFT_JAVA_PROFILE_MISSING"
        : "error.auth.minecraft.profile",
      profileResponse.status,
    );
  }
  const profile = MinecraftProfileSchema.safeParse(profileResponse.payload);
  if (!profile.success) {
    throw new MicrosoftServicesError("MINECRAFT_PROFILE_INVALID_RESPONSE");
  }

  return {
    access_token: minecraftToken.data.access_token,
    client_token: crypto.randomUUID(),
    uuid: profile.data.id,
    name: profile.data.name,
    user_properties: "{}",
    meta: {
      type: "msa",
      demo: false,
      exp: Date.now() + minecraftToken.data.expires_in * 1_000,
    },
  };
}
