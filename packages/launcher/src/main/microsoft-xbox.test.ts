import { describe, expect, it, vi } from "vitest";
import { exchangeMicrosoftTokenForMinecraft } from "./microsoft-xbox";

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("échanges Microsoft vers Minecraft", () => {
  it("ne lance aucune requête quand le signal est déjà annulé", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = vi.fn();

    await expect(
      exchangeMicrosoftTokenForMinecraft("microsoft-token", {
        fetchImpl,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ code: "MICROSOFT_LOGIN_CANCELLED" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("enchaîne Xbox, XSTS, licence et profil sans journaliser de jeton", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ Token: "xbox-token" }))
      .mockResolvedValueOnce(
        jsonResponse({
          Token: "xsts-token",
          DisplayClaims: { xui: [{ uhs: "user-hash" }] },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "minecraft-token", expires_in: 86_400 }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ name: "product_minecraft" }] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ id: "0123456789abcdef0123456789abcdef", name: "Steve" }),
      );
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const authorization = await exchangeMicrosoftTokenForMinecraft(
      "microsoft-token",
      { fetchImpl },
    );

    expect(authorization).toMatchObject({
      access_token: "minecraft-token",
      uuid: "0123456789abcdef0123456789abcdef",
      name: "Steve",
      meta: { type: "msa", demo: false },
    });
    const firstRequest = JSON.parse(
      String(fetchImpl.mock.calls[0][1]?.body),
    ) as { Properties: { RpsTicket: string } };
    expect(firstRequest.Properties.RpsTicket).toBe("d=microsoft-token");
    expect(fetchImpl.mock.calls.map(([url]) => url)).toEqual([
      "https://user.auth.xboxlive.com/user/authenticate",
      "https://xsts.auth.xboxlive.com/xsts/authorize",
      "https://api.minecraftservices.com/authentication/login_with_xbox",
      "https://api.minecraftservices.com/entitlements/mcstore",
      "https://api.minecraftservices.com/minecraft/profile",
    ]);
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("classe le refus XSTS d'un compte enfant sans exposer les jetons", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ Token: "xbox-token" }))
      .mockResolvedValueOnce(jsonResponse({ XErr: 2148916238 }, 401));

    await expect(
      exchangeMicrosoftTokenForMinecraft("microsoft-token", { fetchImpl }),
    ).rejects.toMatchObject({ code: "error.auth.xsts.child", status: 401 });
  });

  it("refuse explicitement un compte sans licence Java", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ Token: "xbox-token" }))
      .mockResolvedValueOnce(
        jsonResponse({
          Token: "xsts-token",
          DisplayClaims: { xui: [{ uhs: "user-hash" }] },
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ access_token: "minecraft-token", expires_in: 86_400 }),
      )
      .mockResolvedValueOnce(jsonResponse({ items: [] }));

    await expect(
      exchangeMicrosoftTokenForMinecraft("microsoft-token", { fetchImpl }),
    ).rejects.toMatchObject({ code: "MINECRAFT_JAVA_LICENSE_MISSING" });
  });
});
