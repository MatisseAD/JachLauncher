import { describe, expect, it, vi } from "vitest";
import { MicrosoftAuthLifecycle } from "./microsoft-auth-lifecycle";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("cycle de vie des opérations Microsoft", () => {
  it("annule et attend la restauration avant un login interactif", async () => {
    const lifecycle = new MicrosoftAuthLifecycle<string>();
    const restoreGate = deferred<string>();
    let restoreSignal: AbortSignal | undefined;
    const restore = lifecycle.runRestore((signal) => {
      restoreSignal = signal;
      return restoreGate.promise;
    });
    const loginOperation = vi.fn(async (signal: AbortSignal) => {
      expect(signal.aborted).toBe(false);
      return "login";
    });

    const login = lifecycle.runLogin(loginOperation);
    expect(restoreSignal?.aborted).toBe(true);
    expect(loginOperation).not.toHaveBeenCalled();

    restoreGate.resolve("restore-annulée");
    await expect(restore).resolves.toBe("restore-annulée");
    await expect(login).resolves.toBe("login");
    expect(loginOperation).toHaveBeenCalledOnce();
  });

  it("réutilise l'opération active au lieu de doubler les échanges", async () => {
    const lifecycle = new MicrosoftAuthLifecycle<string>();
    const gate = deferred<string>();
    const operation = vi.fn(() => gate.promise);

    const first = lifecycle.runLogin(operation);
    const second = lifecycle.runLogin(operation);
    const restoreDuringLogin = lifecycle.runRestore(operation);
    expect(second).toBe(first);
    expect(restoreDuringLogin).toBe(first);
    expect(operation).toHaveBeenCalledOnce();

    gate.resolve("compte");
    await expect(first).resolves.toBe("compte");
  });

  it("logout annule puis attend login et restauration", async () => {
    const lifecycle = new MicrosoftAuthLifecycle<string>();
    const restoreGate = deferred<string>();
    const loginGate = deferred<string>();
    let restoreSignal: AbortSignal | undefined;
    let loginSignal: AbortSignal | undefined;
    const restore = lifecycle.runRestore((signal) => {
      restoreSignal = signal;
      return restoreGate.promise;
    });
    const login = lifecycle.runLogin((signal) => {
      loginSignal = signal;
      return loginGate.promise;
    });

    let logoutFinished = false;
    const logout = lifecycle.cancelAllAndWait().then(() => {
      logoutFinished = true;
    });
    expect(restoreSignal?.aborted).toBe(true);
    await Promise.resolve();
    expect(logoutFinished).toBe(false);

    restoreGate.resolve("restauration annulée");
    await restore;
    await Promise.resolve();
    expect(loginSignal?.aborted).toBe(true);
    expect(logoutFinished).toBe(false);

    loginGate.resolve("login annulé");
    await logout;
    await login;
    expect(logoutFinished).toBe(true);
  });

  it("met une nouvelle connexion en attente pendant le nettoyage exclusif", async () => {
    const lifecycle = new MicrosoftAuthLifecycle<string>();
    const activeGate = deferred<string>();
    const clearGate = deferred<void>();
    const events: string[] = [];
    let activeSignal: AbortSignal | undefined;

    const active = lifecycle.runLogin((signal) => {
      activeSignal = signal;
      events.push("login-actif");
      return activeGate.promise;
    });
    const clearing = lifecycle.runExclusiveClear(async () => {
      events.push("nettoyage-début");
      await clearGate.promise;
      events.push("nettoyage-fin");
    });

    expect(activeSignal?.aborted).toBe(true);
    expect(events).toEqual(["login-actif"]);

    activeGate.resolve("login-annulé");
    await expect(active).resolves.toBe("login-annulé");
    await vi.waitFor(() => expect(events).toContain("nettoyage-début"));

    const queuedOperation = vi.fn(async () => {
      events.push("nouveau-login");
      return "nouveau-compte";
    });
    const queued = lifecycle.runLogin(queuedOperation);
    expect(queuedOperation).not.toHaveBeenCalled();

    clearGate.resolve();
    await expect(clearing).resolves.toBeUndefined();
    await expect(queued).resolves.toBe("nouveau-compte");
    expect(events).toEqual([
      "login-actif",
      "nettoyage-début",
      "nettoyage-fin",
      "nouveau-login",
    ]);
  });
});
