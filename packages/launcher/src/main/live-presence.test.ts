import { afterEach, describe, expect, it, vi } from "vitest";
import { LivePresenceController } from "./live-presence";

const account = {
  type: "offline" as const,
  uuid: "5627dd98-e6be-3c21-b8a8-e92344183641",
  username: "Steve",
};

describe("LivePresenceController", () => {
  afterEach(() => vi.useRealTimers());

  it("keeps the bearer out of callbacks and acknowledges stop_game", async () => {
    vi.useFakeTimers();
    const token = "A".repeat(43);
    const requests: RequestInit[] = [];
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, init?: RequestInit) => {
        requests.push(init ?? {});
        if (!String(_url).endsWith("/session")) {
          return new Response(
            JSON.stringify({
              sessionId: "session-1",
              token,
              expiresAt: new Date(Date.now() + 75_000).toISOString(),
              heartbeatIntervalSeconds: 15,
            }),
            { status: 201 },
          );
        }
        const body = JSON.parse(String(init?.body)) as {
          acknowledgedCommandId?: string;
        };
        return new Response(
          JSON.stringify({
            ok: true,
            nextHeartbeatInSeconds: 15,
            command: body.acknowledgedCommandId
              ? null
              : {
                  id: "11111111-1111-4111-8111-111111111111",
                  action: "stop_game",
                  reason: "Maintenance",
                  source: "admin",
                },
          }),
        );
      },
    );
    const commands: unknown[] = [];
    const controller = new LivePresenceController(
      "3.0.1",
      {
        executeCommand: async (command) => {
          commands.push(command);
        },
        closeClient: vi.fn(),
        report: vi.fn(),
      },
      fetchMock as typeof fetch,
    );

    await expect(
      controller.connect({
        baseUrl: "https://yourlauncher.vercel.app",
        slug: "my-launcher",
        account,
      }),
    ).resolves.toBe(true);
    await controller.heartbeatNow();

    expect(commands).toEqual([
      expect.objectContaining({ action: "stop_game", source: "admin" }),
    ]);
    expect(
      requests.some((request) => String(request.body).includes(token)),
    ).toBe(false);
    expect(
      requests.some((request) =>
        String(request.body).includes("11111111-1111-4111-8111-111111111111"),
      ),
    ).toBe(true);
    await controller.shutdown();
  });

  it("does not retry a launcher that explicitly does not support presence", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            ok: false,
            code: "PRESENCE_UNAVAILABLE",
            message: "Démonstration",
          }),
          { status: 404 },
        ),
    );
    const controller = new LivePresenceController(
      "3.0.1",
      {
        executeCommand: vi.fn(),
        closeClient: vi.fn(),
        report: vi.fn(),
      },
      fetchMock as typeof fetch,
    );

    await expect(
      controller.connect({
        baseUrl: "https://yourlauncher.vercel.app",
        slug: "yourlauncher-demo",
        account,
      }),
    ).resolves.toBe(false);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await controller.shutdown();
  });
});
