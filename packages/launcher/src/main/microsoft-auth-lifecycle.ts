/**
 * Sérialise les opérations Microsoft qui partagent le cache MSAL et
 * l'autorisation Minecraft en mémoire. Une connexion interactive remplace une
 * restauration silencieuse ; une restauration demandée pendant un login
 * réutilise ce login au lieu de lancer un second échange concurrent.
 */
export class MicrosoftAuthLifecycle<T> {
  private loginPromise: Promise<T> | null = null;
  private loginController: AbortController | null = null;
  private restorePromise: Promise<T> | null = null;
  private restoreController: AbortController | null = null;
  private clearPromise: Promise<void> | null = null;

  runLogin(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (this.loginPromise) return this.loginPromise;

    const controller = new AbortController();
    this.loginController = controller;
    const pendingRestore = this.restorePromise;
    const pendingClear = this.clearPromise;
    this.restoreController?.abort();

    const operationPromise = (async () => {
      if (pendingRestore) await pendingRestore;
      if (pendingClear) await pendingClear;
      return operation(controller.signal);
    })();
    const trackedPromise = operationPromise.finally(() => {
      if (this.loginPromise === trackedPromise) this.loginPromise = null;
      if (this.loginController === controller) this.loginController = null;
    });
    this.loginPromise = trackedPromise;
    return trackedPromise;
  }

  runRestore(operation: (signal: AbortSignal) => Promise<T>): Promise<T> {
    if (this.loginPromise) return this.loginPromise;
    if (this.restorePromise) return this.restorePromise;

    const controller = new AbortController();
    this.restoreController = controller;
    const pendingClear = this.clearPromise;
    const operationPromise = (async () => {
      if (pendingClear) await pendingClear;
      return operation(controller.signal);
    })();
    const trackedPromise = operationPromise.finally(() => {
      if (this.restorePromise === trackedPromise) this.restorePromise = null;
      if (this.restoreController === controller) this.restoreController = null;
    });
    this.restorePromise = trackedPromise;
    return trackedPromise;
  }

  /**
   * Annule les opérations actives, les attend, puis garde une barrière pendant
   * tout le nettoyage du cache. Une connexion arrivée entre-temps est mise en
   * file derrière cette barrière et ne peut donc jamais réécrire le cache en
   * parallèle du logout.
   */
  runExclusiveClear(operation: () => Promise<void>): Promise<void> {
    if (this.clearPromise) return this.clearPromise;

    const pending = [this.loginPromise, this.restorePromise].filter(
      (candidate): candidate is Promise<T> => candidate !== null,
    );
    this.loginController?.abort();
    this.restoreController?.abort();

    const operationPromise = (async () => {
      await Promise.allSettled(pending);
      await operation();
    })();
    const trackedPromise = operationPromise.finally(() => {
      if (this.clearPromise === trackedPromise) this.clearPromise = null;
    });
    this.clearPromise = trackedPromise;
    return trackedPromise;
  }

  cancelLogin(): boolean {
    if (!this.loginController) return false;
    this.loginController.abort();
    return true;
  }

  async cancelAllAndWait(): Promise<void> {
    const pending = [this.loginPromise, this.restorePromise].filter(
      (operation): operation is Promise<T> => operation !== null,
    );
    this.loginController?.abort();
    this.restoreController?.abort();
    await Promise.allSettled(pending);
  }
}
