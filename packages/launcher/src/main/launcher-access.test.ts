import { describe, expect, it, vi } from "vitest";
import type { Account } from "../shared-types/ipc";
import { checkLauncherAccess } from "./launcher-access";

const account: Account = {
  type: "microsoft",
  uuid: "069a79f444e94726a5befca90e38aaf5",
  username: "Notch",
  avatarUrl: "https://mc-heads.net/avatar/069a79f444e94726a5befca90e38aaf5/64",
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("contrôle d'accès avant lancement", () => {
  it("envoie uniquement l'identité publique au bon endpoint", async () => {
    const request = vi.fn(
      async (
        _input: Parameters<typeof fetch>[0],
        _init?: Parameters<typeof fetch>[1],
      ) => response({ allowed: true }),
    );
    await expect(
      checkLauncherAccess(
        "http://localhost:3000/",
        "serveur-test",
        account,
        request as typeof fetch,
      ),
    ).resolves.toEqual({ allowed: true, code: undefined, message: undefined });

    expect(request).toHaveBeenCalledOnce();
    const [url, init] = request.mock.calls[0]!;
    expect(url).toBe("http://localhost:3000/api/launcher-access/serveur-test");
    expect(JSON.parse(String(init?.body))).toEqual({
      type: "microsoft",
      uuid: account.uuid,
      username: account.username,
    });
    expect(String(init?.body)).not.toContain("avatarUrl");
    expect(init?.redirect).toBe("error");
  });

  it("respecte exactement le contrat d'un compte hors-ligne", async () => {
    const offline: Account = {
      type: "offline",
      uuid: "5627dd98-e6be-3c21-b8a8-e92344183641",
      username: "Player_01",
      avatarUrl: "https://example.com/avatar.png",
    };
    const request = vi.fn(
      async (
        _input: Parameters<typeof fetch>[0],
        _init?: Parameters<typeof fetch>[1],
      ) => response({ allowed: true }),
    );

    const result = await checkLauncherAccess(
      "http://localhost:3000",
      "serveur-test",
      offline,
      request as typeof fetch,
    );

    expect(result.allowed).toBe(true);
    const [, init] = request.mock.calls[0]!;
    expect(JSON.parse(String(init?.body))).toEqual({
      type: "offline",
      uuid: offline.uuid,
      username: offline.username,
    });
  });

  it("propage un bannissement explicite même avec HTTP 403", async () => {
    const request = vi.fn(async () =>
      response(
        { allowed: false, code: "USER_BANNED", message: "Compte suspendu." },
        403,
      ),
    );
    await expect(
      checkLauncherAccess(
        "http://localhost:3000",
        "serveur-test",
        account,
        request as typeof fetch,
      ),
    ).resolves.toEqual({
      allowed: false,
      code: "USER_BANNED",
      message: "Compte suspendu.",
    });
  });

  it.each([
    [
      503,
      {
        allowed: false,
        code: "ACCESS_CHECK_UNAVAILABLE",
        message: "Base temporairement indisponible.",
      },
    ],
    [
      429,
      {
        allowed: false,
        code: "RATE_LIMITED",
        message: "Trop de tentatives.",
      },
    ],
  ])(
    "classe une décision temporaire HTTP %s comme indisponible",
    async (status, body) => {
      const request = vi.fn(async () => response(body, status));
      const result = await checkLauncherAccess(
        "http://localhost:3000",
        "serveur-test",
        account,
        request as typeof fetch,
      );
      expect(result).toMatchObject({
        allowed: false,
        unavailable: true,
        code: body.code,
        message: body.message,
      });
    },
  );

  it.each([
    ["panne réseau", vi.fn(async () => Promise.reject(new Error("offline")))],
    ["JSON ambigu", vi.fn(async () => response({ allowed: "yes" }))],
    [
      "champs inattendus",
      vi.fn(async () => response({ allowed: true, admin: true })),
    ],
    ["HTTP non autorisé", vi.fn(async () => response({ allowed: true }, 503))],
  ])("bloque en mode fail-closed : %s", async (_label, request) => {
    const result = await checkLauncherAccess(
      "http://localhost:3000",
      "serveur-test",
      account,
      request as typeof fetch,
    );
    expect(result.allowed).toBe(false);
    expect(result.unavailable).toBe(true);
    expect(result.code).toBe("ACCESS_CHECK_UNAVAILABLE");
  });
});
