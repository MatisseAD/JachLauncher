import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createMicrosoftLoopbackCallback,
  createMicrosoftOAuthTransaction,
  createAuthorizationCodePayload,
  createOAuthState,
  createPkcePair,
  parseMicrosoftOAuthCallback,
  verifyOAuthState,
} from "./microsoft-oauth";

describe("Microsoft OAuth PKCE", () => {
  it("génère un verifier RFC 7636 et un challenge S256 exact", () => {
    const { verifier, challenge } = createPkcePair();
    const expected = crypto
      .createHash("sha256")
      .update(verifier, "ascii")
      .digest("base64url");

    expect(verifier).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
    expect(challenge).toBe(expected);
    expect(challenge).toHaveLength(43);
  });

  it("génère et compare des états opaques", () => {
    const first = createOAuthState();
    const second = createOAuthState();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(first).not.toBe(second);
    expect(verifyOAuthState(first, first)).toBe(true);
    expect(verifyOAuthState(first, `${first}x`)).toBe(false);
    expect(verifyOAuthState(first, second)).toBe(false);
  });

  it("retransmet state et nonce à MSAL lors de l'échange du code", () => {
    const transaction = createMicrosoftOAuthTransaction();
    expect(createAuthorizationCodePayload("one-time-code", transaction)).toEqual(
      {
        code: "one-time-code",
        state: transaction.state,
        nonce: transaction.nonce,
      },
    );
  });

  it("rejette un callback dont le state ne correspond pas", () => {
    expect(() =>
      parseMicrosoftOAuthCallback(
        new URL("http://localhost/?code=secret-code&state=attacker"),
        "expected",
      ),
    ).toThrow(/état de sécurité/i);
  });
});

describe("callback OAuth Microsoft loopback", () => {
  it("n'écoute que loopback et retourne le code après validation du state", async () => {
    const state = createOAuthState();
    const callback = await createMicrosoftLoopbackCallback({
      expectedState: state,
      timeoutMs: 2_000,
    });

    expect(callback.redirectUri).toMatch(/^http:\/\/localhost:\d+$/);
    const response = await fetch(
      `${callback.redirectUri}/?code=one-time-code&state=${state}`,
      { redirect: "manual" },
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/complete");
    await expect(callback.waitForCode).resolves.toBe("one-time-code");
    await callback.close();
  });

  it("bloque le callback et ferme le serveur en cas de state invalide", async () => {
    const callback = await createMicrosoftLoopbackCallback({
      expectedState: "expected-state",
      timeoutMs: 2_000,
    });
    const rejected = callback.waitForCode.catch((error: unknown) => error);

    const response = await fetch(
      `${callback.redirectUri}/?code=never-returned&state=wrong-state`,
      { redirect: "manual" },
    );
    expect(response.status).toBe(400);
    await expect(rejected).resolves.toMatchObject({ code: "state_mismatch" });
    await callback.close();
  });

  it("supporte annulation, timeout et nettoyage", async () => {
    const controller = new AbortController();
    const cancelled = await createMicrosoftLoopbackCallback({
      expectedState: createOAuthState(),
      signal: controller.signal,
      timeoutMs: 2_000,
    });
    const cancelledResult = cancelled.waitForCode.catch(
      (error: unknown) => error,
    );
    controller.abort();
    await expect(cancelledResult).resolves.toMatchObject({ code: "cancelled" });
    await cancelled.close();

    const timedOut = await createMicrosoftLoopbackCallback({
      expectedState: createOAuthState(),
      timeoutMs: 20,
    });
    await expect(timedOut.waitForCode).rejects.toMatchObject({
      code: "timeout",
    });
    await timedOut.close();
  });
});
