import { describe, expect, it } from "vitest";
import {
  createPresenceToken,
  hashPresenceToken,
  policyCommand,
  PresenceHeartbeatSchema,
  readPresenceBearer,
} from "./launcher-presence";

describe("launcher presence security contract", () => {
  it("creates opaque 256-bit tokens and persists a one-way hash", () => {
    const token = createPresenceToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(hashPresenceToken(token)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashPresenceToken(token)).not.toContain(token);
  });

  it("accepts only the exact bearer-token shape", () => {
    const token = createPresenceToken();
    expect(
      readPresenceBearer(
        new Request("https://example.test", {
          headers: { authorization: `Bearer ${token}` },
        }),
      ),
    ).toBe(token);
    expect(
      readPresenceBearer(
        new Request("https://example.test", {
          headers: { authorization: `Basic ${token}` },
        }),
      ),
    ).toBeNull();
  });

  it("rejects extra heartbeat properties", () => {
    expect(
      PresenceHeartbeatSchema.safeParse({
        state: "in_game",
        clientVersion: "3.0.1",
        processId: 1234,
      }).success,
    ).toBe(false);
  });

  it("makes a ban or suspension close the client", () => {
    expect(
      policyCommand({
        launcherPublished: true,
        launcherSuspended: false,
        ownerDisabled: false,
        playerBanned: true,
      }),
    ).toMatchObject({ action: "close_client", code: "PLAYER_BANNED" });
    expect(
      policyCommand({
        launcherPublished: true,
        launcherSuspended: true,
        ownerDisabled: false,
        playerBanned: false,
      }),
    ).toMatchObject({ action: "close_client", code: "LAUNCHER_SUSPENDED" });
  });
});
