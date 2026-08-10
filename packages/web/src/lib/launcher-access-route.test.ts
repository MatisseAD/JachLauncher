import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/launcher-access/[slug]/route";
import { DEMO_SLUG } from "./demo-slugs";

const database = vi.hoisted(() => ({
  findLauncher: vi.fn(),
  findPlayerBan: vi.fn(),
}));

vi.mock("./db", () => ({
  prisma: {
    launcher: { findUnique: database.findLauncher },
    playerBan: { findFirst: database.findPlayerBan },
  },
}));

async function post(body: unknown) {
  return POST(
    new Request(
      `https://yourlauncher.example/api/launcher-access/${DEMO_SLUG.yourLauncher}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      },
    ),
    { params: Promise.resolve({ slug: DEMO_SLUG.yourLauncher }) },
  );
}

describe("POST /api/launcher-access/[slug]", () => {
  beforeEach(() => {
    database.findLauncher.mockReset();
    database.findPlayerBan.mockReset().mockResolvedValue(null);
  });

  it("accepte le payload Account strict envoyé par le launcher", async () => {
    const response = await post({
      type: "microsoft",
      uuid: "069a79f444e94726a5befca90e38aaf5",
      username: "Notch",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ allowed: true });
    expect(database.findLauncher).not.toHaveBeenCalled();
    expect(database.findPlayerBan).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          subjectType: "microsoft_uuid",
          subjectValue: "069a79f444e94726a5befca90e38aaf5",
          AND: expect.arrayContaining([{ launcherId: null }]),
        }),
      }),
    );
  });

  it("applique une interdiction globale aux launchers de démonstration", async () => {
    database.findPlayerBan.mockResolvedValue({ id: "global-ban" });

    const response = await post({
      type: "offline",
      uuid: "unused-offline-uuid",
      username: "Steve",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      allowed: false,
      code: "PLAYER_BANNED",
    });
    expect(database.findLauncher).not.toHaveBeenCalled();
  });

  it("refuse un contrat enrichi accidentellement", async () => {
    const response = await post({
      type: "offline",
      uuid: "local-value",
      username: "Steve",
      avatarUrl: "https://example.test/avatar.png",
    });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      allowed: false,
      code: "INVALID_REQUEST",
    });
  });
});
