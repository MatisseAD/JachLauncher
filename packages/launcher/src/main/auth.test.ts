import type { AuthenticationResult } from "@azure/msal-node";
import { describe, expect, it } from "vitest";
import {
  classifyMicrosoftAuthError,
  canCommitMicrosoftAuthorization,
  assertSafeMicrosoftAuthorizationUrl,
  isMinecraftAuthorizationFresh,
  isRecoverableMicrosoftCacheError,
  microsoftAuthorizationToAccount,
  offlineUuid,
  prepareMicrosoftCacheForInteractiveLogin,
  restoreMicrosoftCacheSnapshot,
  resolveAzureClientId,
  runMicrosoftAccountSwitchTransaction,
  selectUnambiguousMicrosoftAccount,
  setOfflineAccount,
  type MinecraftAuthorization,
} from "./auth";
import { SecureTokenCacheError } from "./secure-token-cache";

function fakeMsalAccount(homeAccountId: string) {
  return { homeAccountId } as NonNullable<AuthenticationResult["account"]>;
}

function fakeMicrosoftAuthorization(
  name: string,
  uuid: string,
): MinecraftAuthorization {
  return {
    access_token: `minecraft-${uuid}`,
    client_token: `client-${uuid}`,
    uuid,
    name,
    user_properties: "{}",
    meta: { type: "msa" },
  };
}

function createAccountSwitchHarness(
  initialAccountIds: string[],
  selectedAccountId = "B",
) {
  const controller = new AbortController();
  const events: string[] = [];
  const persistedSnapshots: string[] = [];
  let cacheState = { accountIds: [...initialAccountIds], revision: 0 };
  let committedAuthorization = fakeMicrosoftAuthorization("Alice", "A");

  const run = (options?: {
    exchange?: (
      result: AuthenticationResult,
    ) => Promise<MinecraftAuthorization>;
    remove?: (accountId: string) => Promise<void>;
  }) =>
    runMicrosoftAccountSwitchTransaction({
      signal: controller.signal,
      async loadAccounts() {
        events.push("load");
        return cacheState.accountIds.map(fakeMsalAccount);
      },
      serializeCache() {
        events.push("snapshot");
        return JSON.stringify(cacheState);
      },
      async restoreCache(snapshot) {
        events.push("restore");
        persistedSnapshots.push(snapshot);
        cacheState = JSON.parse(snapshot) as typeof cacheState;
      },
      async acquireToken() {
        events.push(`acquire:${selectedAccountId}`);
        cacheState = {
          accountIds: cacheState.accountIds.includes(selectedAccountId)
            ? [...cacheState.accountIds]
            : [...cacheState.accountIds, selectedAccountId],
          revision: cacheState.revision + 1,
        };
        return {
          account: fakeMsalAccount(selectedAccountId),
          accessToken: `microsoft-${selectedAccountId}`,
        } as AuthenticationResult;
      },
      async exchangeToken(result) {
        events.push(`exchange:${result.account?.homeAccountId ?? "missing"}`);
        return options?.exchange
          ? options.exchange(result)
          : fakeMicrosoftAuthorization("Bob", selectedAccountId);
      },
      async removeAccount(account) {
        events.push(`remove:${account.homeAccountId}`);
        if (options?.remove) await options.remove(account.homeAccountId);
        cacheState = {
          accountIds: cacheState.accountIds.filter(
            (id) => id !== account.homeAccountId,
          ),
          revision: cacheState.revision + 1,
        };
      },
      commitAuthorization(authorization) {
        events.push(`commit:${authorization.uuid}`);
        committedAuthorization = authorization;
      },
    });

  return {
    controller,
    events,
    persistedSnapshots,
    run,
    get accountIds() {
      return cacheState.accountIds;
    },
    get cacheRevision() {
      return cacheState.revision;
    },
    get committedAuthorization() {
      return committedAuthorization;
    },
  };
}

describe("authentification hors ligne", () => {
  it("génère un UUID v3 déterministe", () => {
    expect(offlineUuid("Steve")).toBe(offlineUuid("Steve"));
    expect(offlineUuid("Steve")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-3[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("valide strictement le pseudo Minecraft", () => {
    expect(setOfflineAccount("Player_01").ok).toBe(true);
    expect(setOfflineAccount("../evil").ok).toBe(false);
    expect(setOfflineAccount("ab").ok).toBe(false);
  });

  it("préfère le client ID Azure fourni au runtime", () => {
    const runtime = "11111111-1111-4111-8111-111111111111";
    const bundled = "22222222-2222-4222-8222-222222222222";
    const alias = "33333333-3333-4333-8333-333333333333";
    expect(resolveAzureClientId(runtime, bundled, alias)).toBe(runtime);
  });

  it("accepte JACH_ID comme alias de développement", () => {
    const alias = "33333333-3333-4333-8333-333333333333";
    const bundled = "22222222-2222-4222-8222-222222222222";
    expect(resolveAzureClientId(undefined, bundled, alias)).toBe(alias);
  });

  it("utilise le client ID embarqué dans un build packagé", () => {
    const bundled = "22222222-2222-4222-8222-222222222222";
    expect(resolveAzureClientId(undefined, bundled, undefined)).toBe(bundled);
    expect(resolveAzureClientId(undefined, undefined, undefined)).toBeNull();
  });

  it("refuse un client ID Azure mal formé", () => {
    expect(() =>
      resolveAzureClientId("pas-un-guid", undefined, undefined),
    ).toThrow(/format GUID/);
  });

  it.each([
    ["error.gui.closed", /annulée/],
    ["JACH_AZURE_CLIENT_ID invalide : format GUID", /absent ou mal formé/],
    ["AADSTS50011 redirect_uri mismatch", /URI de redirection/],
    ["AADSTS700016", /comptes Microsoft personnels/],
    ["error.auth.xsts.userNotFound", /profil Xbox/],
    ["XErr 2148916238", /famille Microsoft/],
    ["error.auth.xsts.bannedCountry", /pays/],
    [
      "MINECRAFT_APP_REGISTRATION_NOT_APPROVED HTTP 403",
      /pas encore autorisé par Mojang/,
    ],
    ["error.auth.minecraft.profile NOT_FOUND", /licence Minecraft/],
    ["MICROSOFT_MULTIPLE_ACCOUNTS", /Plusieurs sessions Microsoft/],
  ])("explique l'erreur Microsoft %s", (detail, expected) => {
    expect(classifyMicrosoftAuthError(detail)).toMatch(expected);
  });

  it("n'autorise que l'endpoint consumers HTTPS de Microsoft", () => {
    expect(
      assertSafeMicrosoftAuthorizationUrl(
        "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize?scope=XboxLive.signin",
      ),
    ).toContain("login.microsoftonline.com/consumers/oauth2/v2.0/authorize");
    expect(() =>
      assertSafeMicrosoftAuthorizationUrl(
        "https://attacker.invalid/consumers/oauth2/v2.0/authorize",
      ),
    ).toThrow(/URL_REJECTED/);
  });

  it("ne restaure jamais un compte arbitraire après un crash", () => {
    const only = { homeAccountId: "A" };
    expect(selectUnambiguousMicrosoftAccount([])).toBeNull();
    expect(selectUnambiguousMicrosoftAccount([only])).toBe(only);
    expect(() =>
      selectUnambiguousMicrosoftAccount([
        { homeAccountId: "A" },
        { homeAccountId: "B" },
      ]),
    ).toThrow("MICROSOFT_MULTIPLE_ACCOUNTS");
  });

  it("abandonne toujours l'instance MSAL sale après un rollback", async () => {
    let discarded = false;

    await expect(
      restoreMicrosoftCacheSnapshot(
        "snapshot-A",
        async () => {
          throw new Error("CACHE_WRITE_FAILED");
        },
        () => {
          discarded = true;
        },
      ),
    ).rejects.toThrow("CACHE_WRITE_FAILED");

    expect(discarded).toBe(true);
  });

  it("rafraîchit un jeton Minecraft cinq minutes avant son expiration", () => {
    const now = 1_000_000;
    const authorization = {
      access_token: "memory-only",
      client_token: "client",
      uuid: "0123456789abcdef0123456789abcdef",
      name: "Steve",
      user_properties: "{}",
      meta: { type: "msa", exp: now + 10 * 60 * 1_000 },
    };
    expect(isMinecraftAuthorizationFresh(authorization, now)).toBe(true);
    expect(
      isMinecraftAuthorizationFresh(
        {
          ...authorization,
          meta: { ...authorization.meta, exp: now + 60_000 },
        },
        now,
      ),
    ).toBe(false);
  });

  it("réinitialise uniquement un cache corrompu, jamais un coffre indisponible", () => {
    expect(
      isRecoverableMicrosoftCacheError(
        new SecureTokenCacheError("cache_invalid", "corrompu"),
      ),
    ).toBe(true);
    expect(
      isRecoverableMicrosoftCacheError(
        new SecureTokenCacheError(
          "encryption_unavailable",
          "coffre indisponible",
        ),
      ),
    ).toBe(false);
  });

  it("supprime réellement un cache corrompu avant le login interactif", async () => {
    let cleared = false;
    await expect(
      prepareMicrosoftCacheForInteractiveLogin({
        async load() {
          throw new SecureTokenCacheError("cache_invalid", "corrompu");
        },
        async clear() {
          cleared = true;
        },
      }),
    ).resolves.toBe("reset");
    expect(cleared).toBe(true);
  });

  it("ne contourne jamais un coffre-fort indisponible", async () => {
    let cleared = false;
    await expect(
      prepareMicrosoftCacheForInteractiveLogin({
        async load() {
          throw new SecureTokenCacheError(
            "encryption_unavailable",
            "coffre indisponible",
          );
        },
        async clear() {
          cleared = true;
        },
      }),
    ).rejects.toMatchObject({ code: "encryption_unavailable" });
    expect(cleared).toBe(false);
  });

  it("renvoie au renderer uniquement les métadonnées du compte Minecraft", () => {
    const account = microsoftAuthorizationToAccount({
      access_token: "secret-en-mémoire",
      client_token: "secret-client",
      uuid: "0123456789abcdef0123456789abcdef",
      name: "Steve",
      user_properties: "{}",
      meta: { type: "msa" },
    });
    expect(account).toEqual({
      type: "microsoft",
      username: "Steve",
      uuid: "0123456789abcdef0123456789abcdef",
      avatarUrl:
        "https://mc-heads.net/avatar/0123456789abcdef0123456789abcdef/64",
    });
    expect(account).not.toHaveProperty("access_token");
    expect(account).not.toHaveProperty("client_token");
  });

  it("interdit un commit après annulation ou changement de compte", () => {
    const controller = new AbortController();
    expect(canCommitMicrosoftAuthorization(controller.signal, () => true)).toBe(
      true,
    );
    controller.abort();
    expect(canCommitMicrosoftAuthorization(controller.signal, () => true)).toBe(
      false,
    );
    expect(canCommitMicrosoftAuthorization(undefined, () => false)).toBe(false);
  });

  it("conserve A et restaure le cache si l'échange Xbox/Minecraft de B échoue", async () => {
    const harness = createAccountSwitchHarness(["A"]);

    await expect(
      harness.run({
        async exchange() {
          throw new Error("XBOX_EXCHANGE_FAILED");
        },
      }),
    ).rejects.toThrow("XBOX_EXCHANGE_FAILED");

    expect(harness.accountIds).toEqual(["A"]);
    expect(harness.cacheRevision).toBe(0);
    expect(harness.committedAuthorization.name).toBe("Alice");
    expect(harness.events).not.toContain("remove:A");
    expect(harness.events.at(-1)).toBe("restore");
    expect(harness.persistedSnapshots).toHaveLength(1);
  });

  it("annule A vers B sans supprimer A ni publier B", async () => {
    const harness = createAccountSwitchHarness(["A"]);

    await expect(
      harness.run({
        async exchange() {
          harness.controller.abort();
          return fakeMicrosoftAuthorization("Bob", "B");
        },
      }),
    ).rejects.toThrow("MICROSOFT_LOGIN_CANCELLED");

    expect(harness.accountIds).toEqual(["A"]);
    expect(harness.cacheRevision).toBe(0);
    expect(harness.committedAuthorization.name).toBe("Alice");
    expect(harness.events).not.toContain("remove:A");
    expect(harness.events).not.toContain("commit:B");
  });

  it("ne prune A qu'après un échange B réussi, puis publie B", async () => {
    const harness = createAccountSwitchHarness(["A"]);

    await expect(harness.run()).resolves.toMatchObject({
      ok: true,
      account: { type: "microsoft", username: "Bob", uuid: "B" },
    });

    expect(harness.accountIds).toEqual(["B"]);
    expect(harness.committedAuthorization.name).toBe("Bob");
    expect(harness.persistedSnapshots).toHaveLength(0);
    expect(harness.events.indexOf("exchange:B")).toBeLessThan(
      harness.events.indexOf("remove:A"),
    );
    expect(harness.events.indexOf("remove:A")).toBeLessThan(
      harness.events.indexOf("commit:B"),
    );
  });

  it("restaure aussi un B préexistant au lieu de le supprimer en cas d'échec", async () => {
    const harness = createAccountSwitchHarness(["A", "B"]);

    await expect(
      harness.run({
        async exchange() {
          throw new Error("MINECRAFT_PROFILE_FAILED");
        },
      }),
    ).rejects.toThrow("MINECRAFT_PROFILE_FAILED");

    expect(harness.accountIds).toEqual(["A", "B"]);
    expect(harness.cacheRevision).toBe(0);
    expect(harness.committedAuthorization.name).toBe("Alice");
    expect(
      harness.events.filter((event) => event.startsWith("remove:")),
    ).toEqual([]);
    expect(harness.persistedSnapshots).toHaveLength(1);
  });
});
