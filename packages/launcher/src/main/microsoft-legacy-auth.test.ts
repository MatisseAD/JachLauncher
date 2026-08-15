import { describe, expect, it } from "vitest";
import {
  LEGACY_CLIENT_ID,
  LEGACY_REDIRECT_URI,
  LegacyAuthError,
  buildLegacyAuthorizeUrl,
  extractLegacyAuthCode,
  redeemLegacyAuthCode,
  refreshLegacyToken,
} from "./microsoft-legacy-auth";

describe("buildLegacyAuthorizeUrl", () => {
  it("cible login.live.com avec l'identifiant public du launcher officiel", () => {
    const url = new URL(buildLegacyAuthorizeUrl());

    expect(url.origin + url.pathname).toBe(
      "https://login.live.com/oauth20_authorize.srf",
    );
    expect(url.searchParams.get("client_id")).toBe(LEGACY_CLIENT_ID);
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("redirect_uri")).toBe(LEGACY_REDIRECT_URI);
    expect(url.searchParams.get("scope")).toBe(
      "service::user.auth.xboxlive.com::MBI_SSL",
    );
  });
});

describe("extractLegacyAuthCode", () => {
  it("ignore les URL intermédiaires de connexion", () => {
    expect(
      extractLegacyAuthCode("https://login.live.com/ppsecure/post.srf"),
    ).toBeNull();
    expect(extractLegacyAuthCode("pas-une-url")).toBeNull();
  });

  it("extrait le code de la redirection finale", () => {
    expect(
      extractLegacyAuthCode(`${LEGACY_REDIRECT_URI}?code=M.C123_ABC&lc=1036`),
    ).toBe("M.C123_ABC");
  });

  it("renvoie null si la redirection finale ne porte pas encore de code", () => {
    expect(extractLegacyAuthCode(LEGACY_REDIRECT_URI)).toBeNull();
  });

  it("signale une annulation utilisateur", () => {
    expect(() =>
      extractLegacyAuthCode(`${LEGACY_REDIRECT_URI}?error=access_denied`),
    ).toThrow(/MICROSOFT_LOGIN_CANCELLED/);
  });

  it("propage les autres erreurs Microsoft", () => {
    expect(() =>
      extractLegacyAuthCode(
        `${LEGACY_REDIRECT_URI}?error=invalid_scope&error_description=bad`,
      ),
    ).toThrow(/invalid_scope/);
  });
});

describe("redeemLegacyAuthCode", () => {
  it("échange le code sans secret client et renvoie les jetons", async () => {
    let seenBody = "";
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      seenBody = String(init?.body ?? "");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          access_token: "jeton-msa",
          refresh_token: "refresh-msa",
          expires_in: 86_400,
        }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const tokens = await redeemLegacyAuthCode("CODE", { fetchImpl });

    expect(tokens.accessToken).toBe("jeton-msa");
    expect(tokens.refreshToken).toBe("refresh-msa");
    expect(tokens.expiresAt).toBeGreaterThan(Date.now());
    expect(seenBody).toContain(`client_id=${LEGACY_CLIENT_ID}`);
    expect(seenBody).toContain("grant_type=authorization_code");
    expect(seenBody).not.toContain("client_secret");
  });

  it("n'expose jamais le corps HTTP en cas de refus", async () => {
    const fetchImpl = (async () =>
      ({
        ok: false,
        status: 400,
        json: async () => ({ error: "invalid_grant", secret: "jeton" }),
      }) as unknown as Response) as unknown as typeof fetch;

    await expect(redeemLegacyAuthCode("CODE", { fetchImpl })).rejects.toThrow(
      /MICROSOFT_LEGACY_TOKEN_REFUSED/,
    );
  });

  it("rejette une réponse sans access_token", async () => {
    const fetchImpl = (async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({ token_type: "bearer" }),
      }) as unknown as Response) as unknown as typeof fetch;

    await expect(redeemLegacyAuthCode("CODE", { fetchImpl })).rejects.toThrow(
      LegacyAuthError,
    );
  });
});

describe("refreshLegacyToken", () => {
  it("utilise le grant_type refresh_token", async () => {
    let seenBody = "";
    const fetchImpl = (async (_url: string, init?: RequestInit) => {
      seenBody = String(init?.body ?? "");
      return {
        ok: true,
        status: 200,
        json: async () => ({ access_token: "nouveau" }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const tokens = await refreshLegacyToken("refresh-msa", { fetchImpl });

    expect(tokens.accessToken).toBe("nouveau");
    expect(seenBody).toContain("grant_type=refresh_token");
    expect(seenBody).toContain("refresh_token=refresh-msa");
  });
});
