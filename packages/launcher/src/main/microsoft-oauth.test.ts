import crypto from "node:crypto";
import { describe, expect, it } from "vitest";
import { classifyMicrosoftAuthError } from "./auth";
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
    expect(
      createAuthorizationCodePayload("one-time-code", transaction),
    ).toEqual({
      code: "one-time-code",
      state: transaction.state,
      nonce: transaction.nonce,
    });
  });

  it("rejette un callback dont le state ne correspond pas", () => {
    expect(() =>
      parseMicrosoftOAuthCallback(
        new URL("http://localhost/?code=secret-code&state=attacker"),
        "expected",
      ),
    ).toThrow(/état de sécurité/i);
  });

  it("transmet uniquement le code AADSTS sûr au classifieur", () => {
    const state = createOAuthState();
    const callbackUrl = new URL("http://localhost/");
    callbackUrl.searchParams.set("state", state);
    callbackUrl.searchParams.set("error", "unauthorized_client");
    callbackUrl.searchParams.set(
      "error_description",
      "AADSTS50020: User account alice@example.invalid access_token=secret-token must not leak",
    );

    let callbackError: unknown;
    try {
      parseMicrosoftOAuthCallback(callbackUrl, state);
    } catch (error) {
      callbackError = error;
    }

    expect(callbackError).toBeInstanceOf(Error);
    const message = (callbackError as Error).message;
    expect(message).toBe("Microsoft OAuth a refusé la demande (AADSTS50020).");
    expect(classifyMicrosoftAuthError(message)).toMatch(/audience/);
    expect(message).not.toContain("alice@example.invalid");
    expect(message).not.toContain("secret-token");
    expect(message).not.toContain("must not leak");
  });

  it("ne propage aucun texte libre lorsque la description n'a pas de code AADSTS", () => {
    const state = createOAuthState();
    const callbackUrl = new URL("http://localhost/");
    callbackUrl.searchParams.set("state", state);
    callbackUrl.searchParams.set("error", "token-stolen-by-attacker");
    callbackUrl.searchParams.set(
      "error_description",
      "Bearer very-secret-token for bob@example.invalid",
    );

    expect(() => parseMicrosoftOAuthCallback(callbackUrl, state)).toThrow(
      "Microsoft OAuth a refusé la demande (oauth_error).",
    );
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
    expect(callback.listeningHosts).toContain("127.0.0.1");

    const callbackPort = new URL(callback.redirectUri).port;
    const ipv4Probe = await fetch(`http://127.0.0.1:${callbackPort}/complete`);
    expect(ipv4Probe.status).toBe(404);
    if (callback.listeningHosts.includes("::1")) {
      const ipv6Probe = await fetch(`http://[::1]:${callbackPort}/inconnu`);
      expect(ipv6Probe.status).toBe(404);
    }

    const response = await fetch(
      `${callback.redirectUri}/?code=one-time-code&state=${state}`,
      { redirect: "manual" },
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/complete");
    await expect(callback.waitForCode).resolves.toBe("one-time-code");

    // Même si MSAL termine immédiatement l'échange du code, close() laisse au
    // navigateur le temps de charger la page finale au lieu d'afficher ERR_CONNECTION_REFUSED.
    const closePromise = callback.close();
    const completion = await fetch(`${callback.redirectUri}/complete`);
    const completionHtml = await completion.text();
    expect(completion.status).toBe(200);
    expect(completionHtml).toContain("Autorisation reçue");
    expect(completionHtml).toContain("Fermer cet onglet");
    expect(completionHtml).not.toContain("one-time-code");
    await closePromise;
  });

  it("redirige aussi un state invalide vers une page locale propre", async () => {
    const callback = await createMicrosoftLoopbackCallback({
      expectedState: "expected-state",
      timeoutMs: 2_000,
    });
    const rejected = callback.waitForCode.catch((error: unknown) => error);

    const response = await fetch(
      `${callback.redirectUri}/?code=never-returned&state=wrong-state`,
      { redirect: "manual" },
    );
    const rawBody = await response.text();
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/complete/error");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(rawBody).toBe("");
    expect(response.headers.get("location")).not.toContain("wrong-state");
    expect(response.headers.get("location")).not.toContain("never-returned");
    await expect(rejected).resolves.toMatchObject({ code: "state_mismatch" });

    const completion = await fetch(`${callback.redirectUri}/complete/error`);
    const completionHtml = await completion.text();
    expect(completion.status).toBe(200);
    expect(completion.headers.get("cache-control")).toBe("no-store");
    expect(completion.headers.get("referrer-policy")).toBe("no-referrer");
    expect(completionHtml).toContain("Connexion non validée");
    expect(completionHtml).not.toContain("wrong-state");
    expect(completionHtml).not.toContain("never-returned");
    await callback.close();
  });

  it("retire error_description, email, token et state de l'URL et de la page d'erreur", async () => {
    const state = createOAuthState();
    const callback = await createMicrosoftLoopbackCallback({
      expectedState: state,
      timeoutMs: 2_000,
    });
    const rejected = callback.waitForCode.catch((error: unknown) => error);
    const rawCallback = new URL(callback.redirectUri);
    rawCallback.searchParams.set("state", state);
    rawCallback.searchParams.set("error", "unauthorized_client");
    rawCallback.searchParams.set(
      "error_description",
      "AADSTS50020 alice@example.invalid access_token=very-secret-token",
    );

    const response = await fetch(rawCallback, { redirect: "manual" });
    const rawBody = await response.text();
    const location = response.headers.get("location") ?? "";
    expect(response.status).toBe(303);
    expect(location).toBe("/complete/error");
    expect(rawBody).toBe("");
    for (const secret of [
      state,
      "error_description",
      "alice@example.invalid",
      "very-secret-token",
    ]) {
      expect(location).not.toContain(secret);
      expect(rawBody).not.toContain(secret);
    }

    const callbackError = await rejected;
    expect(callbackError).toMatchObject({ code: "oauth_error" });
    expect((callbackError as Error).message).toBe(
      "Microsoft OAuth a refusé la demande (AADSTS50020).",
    );

    const completion = await fetch(`${callback.redirectUri}${location}`);
    const completionHtml = await completion.text();
    expect(completion.status).toBe(200);
    expect(completion.headers.get("cache-control")).toBe("no-store");
    expect(completion.headers.get("referrer-policy")).toBe("no-referrer");
    expect(completionHtml).toContain("Connexion non validée");
    for (const secret of [
      state,
      "AADSTS50020",
      "error_description",
      "alice@example.invalid",
      "very-secret-token",
    ]) {
      expect(completionHtml).not.toContain(secret);
    }
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
