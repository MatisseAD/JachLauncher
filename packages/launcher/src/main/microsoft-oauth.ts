import crypto from "node:crypto";
import http, { type IncomingMessage, type ServerResponse } from "node:http";

const DEFAULT_CALLBACK_TIMEOUT_MS = 5 * 60 * 1_000;
// Le navigateur peut retarder la navigation qui suit le 303 (antivirus,
// restauration d'onglet, résolution IPv4/IPv6). Garde le serveur assez
// longtemps pour éviter une page localhost « connexion refusée » après succès.
const COMPLETION_PAGE_GRACE_MS = 10_000;
const MAX_AUTHORIZATION_CODE_LENGTH = 8_192;

export type MicrosoftOAuthCallbackErrorCode =
  | "cancelled"
  | "timeout"
  | "state_mismatch"
  | "oauth_error"
  | "invalid_callback"
  | "server_error";

export class MicrosoftOAuthCallbackError extends Error {
  constructor(
    public readonly code: MicrosoftOAuthCallbackErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "MicrosoftOAuthCallbackError";
  }
}

export interface PkcePair {
  verifier: string;
  challenge: string;
}

export interface MicrosoftOAuthTransaction extends PkcePair {
  state: string;
  nonce: string;
}

export interface MicrosoftLoopbackCallback {
  /** URI dynamique envoyée à MSAL. L'inscription Azure reste `http://localhost`. */
  redirectUri: string;
  /** Interfaces effectivement ouvertes, utile pour diagnostiquer IPv4/IPv6. */
  listeningHosts: readonly string[];
  waitForCode: Promise<string>;
  close(): Promise<void>;
}

function base64Url(input: Buffer): string {
  return input.toString("base64url");
}

/** Crée un verifier RFC 7636 et son challenge SHA-256 (S256). */
export function createPkcePair(): PkcePair {
  const verifier = base64Url(crypto.randomBytes(64));
  const challenge = base64Url(
    crypto.createHash("sha256").update(verifier, "ascii").digest(),
  );
  return { verifier, challenge };
}

/** Valeur opaque anti-CSRF, sans information utilisateur. */
export function createOAuthState(): string {
  return base64Url(crypto.randomBytes(32));
}

export function createMicrosoftOAuthTransaction(): MicrosoftOAuthTransaction {
  return {
    ...createPkcePair(),
    state: createOAuthState(),
    nonce: createOAuthState(),
  };
}

export function createAuthorizationCodePayload(
  code: string,
  transaction: MicrosoftOAuthTransaction,
): { code: string; state: string; nonce: string } {
  return {
    code,
    state: transaction.state,
    nonce: transaction.nonce,
  };
}

/** Comparaison en temps constant lorsque les longueurs sont identiques. */
export function verifyOAuthState(expected: string, received: string): boolean {
  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(received, "utf8");
  return (
    expectedBuffer.length === receivedBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

function safeOAuthError(error: string | null): string {
  const normalized = (error ?? "oauth_error")
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .slice(0, 80);
  return normalized || "oauth_error";
}

/**
 * Valide le callback avant de rendre le code à MSAL. Aucun message d'erreur ne
 * contient le code d'autorisation ni le contenu arbitraire de la requête.
 */
export function parseMicrosoftOAuthCallback(
  callbackUrl: URL,
  expectedState: string,
): { code: string } {
  const receivedState = callbackUrl.searchParams.get("state") ?? "";
  if (!verifyOAuthState(expectedState, receivedState)) {
    throw new MicrosoftOAuthCallbackError(
      "state_mismatch",
      "L'état de sécurité renvoyé par Microsoft ne correspond pas à la demande.",
    );
  }

  const oauthError = callbackUrl.searchParams.get("error");
  if (oauthError) {
    throw new MicrosoftOAuthCallbackError(
      "oauth_error",
      `Microsoft OAuth a refusé la demande (${safeOAuthError(oauthError)}).`,
    );
  }

  const code = callbackUrl.searchParams.get("code") ?? "";
  if (!code || code.length > MAX_AUTHORIZATION_CODE_LENGTH) {
    throw new MicrosoftOAuthCallbackError(
      "invalid_callback",
      "Le callback Microsoft ne contient pas de code d'autorisation valide.",
    );
  }
  return { code };
}

function isLoopbackAddress(address: string | undefined): boolean {
  return (
    address === "127.0.0.1" ||
    address === "::1" ||
    address === "::ffff:127.0.0.1"
  );
}

function pageHeaders(nonce: string): Record<string, string> {
  return {
    "Cache-Control": "no-store",
    Connection: "close",
    "Content-Security-Policy": `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'`,
    "Content-Type": "text/html; charset=utf-8",
    "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  };
}

function renderPage(
  title: string,
  detail: string,
  nonce: string,
  closeable = false,
): string {
  const closeControl = closeable
    ? `<button id="close" type="button">Fermer cet onglet</button><p id="close-help" class="help">Si le navigateur bloque la fermeture automatique, ferme simplement cet onglet.</p><script nonce="${nonce}">history.replaceState(null,"","/complete");const button=document.getElementById("close");const closePage=()=>{window.close();document.getElementById("close-help").textContent="Tu peux maintenant fermer cet onglet et revenir dans YourLauncher."};button.addEventListener("click",closePage);setTimeout(closePage,900);</script>`
    : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><style nonce="${nonce}">body{font-family:system-ui,sans-serif;background:#0b0814;color:#f6f2ff;display:grid;place-items:center;min-height:100vh;margin:0}.card{max-width:32rem;padding:2rem;border:1px solid #493870;border-radius:1rem;background:#171126}h1{font-size:1.35rem}p{color:#cfc5e8;line-height:1.5}button{appearance:none;border:0;border-radius:.65rem;background:#8b5cf6;color:white;font:inherit;font-weight:700;padding:.75rem 1rem;cursor:pointer}.help{font-size:.85rem}</style></head><body><main class="card"><h1>${title}</h1><p>${detail}</p>${closeControl}</main></body></html>`;
}

function reply(
  response: ServerResponse,
  status: number,
  title: string,
  detail: string,
  nonce: string,
  options: { closeable?: boolean; onFinished?: () => void } = {},
): void {
  response.writeHead(status, pageHeaders(nonce));
  response.end(
    renderPage(title, detail, nonce, options.closeable),
    options.onFinished,
  );
}

function closeServer(server: http.Server, force = false): Promise<void> {
  return new Promise((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(() => resolve());
    if (force) server.closeAllConnections?.();
    else server.closeIdleConnections?.();
    server.unref();
  });
}

async function closeServers(
  servers: readonly http.Server[],
  force = false,
): Promise<void> {
  await Promise.all(servers.map((server) => closeServer(server, force)));
}

function listenLoopback(
  server: http.Server,
  port: number,
  host: "127.0.0.1" | "::1",
): Promise<number> {
  return new Promise((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once("error", onError);
    server.listen(port, host, () => {
      server.off("error", onError);
      const address = server.address();
      if (!address || typeof address === "string" || !address.port) {
        reject(
          new MicrosoftOAuthCallbackError(
            "server_error",
            "Impossible de déterminer le port du callback Microsoft.",
          ),
        );
        return;
      }
      resolve(address.port);
    });
  });
}

/**
 * Démarre un callback éphémère exclusivement sur les interfaces loopback.
 * L'URI reste `localhost`, comme l'exige l'inscription Azure, mais le même port
 * écoute aussi `::1` lorsque Windows dispose d'IPv6 : Chrome peut ainsi choisir
 * IPv4 ou IPv6 sans tomber sur une page « connexion refusée ».
 */
export async function createMicrosoftLoopbackCallback(options: {
  expectedState: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<MicrosoftLoopbackCallback> {
  const { expectedState, signal } = options;
  const timeoutMs = options.timeoutMs ?? DEFAULT_CALLBACK_TIMEOUT_MS;
  if (!expectedState || timeoutMs <= 0 || !Number.isFinite(timeoutMs)) {
    throw new MicrosoftOAuthCallbackError(
      "invalid_callback",
      "Configuration du callback Microsoft invalide.",
    );
  }
  if (signal?.aborted) {
    throw new MicrosoftOAuthCallbackError(
      "cancelled",
      "Connexion Microsoft annulée.",
    );
  }

  let resolveCode!: (code: string) => void;
  let rejectCode!: (error: Error) => void;
  let settled = false;
  let codeAccepted = false;
  let completionPageServed = false;
  let resolveCompletionPage!: () => void;
  const completionPage = new Promise<void>((resolve) => {
    resolveCompletionPage = resolve;
  });
  const waitForCode = new Promise<string>((resolve, reject) => {
    resolveCode = resolve;
    rejectCode = reject;
  });

  const settleError = (error: Error): void => {
    if (settled) return;
    settled = true;
    rejectCode(error);
  };
  const settleCode = (code: string): void => {
    if (settled) return;
    settled = true;
    resolveCode(code);
  };

  let redirectUri = "http://localhost";
  const pageNonce = crypto.randomBytes(18).toString("base64");
  const servers: http.Server[] = [];
  const listeningHosts: string[] = [];
  const handleRequest = (
    request: IncomingMessage,
    response: ServerResponse,
  ): void => {
    if (!isLoopbackAddress(request.socket.remoteAddress)) {
      reply(
        response,
        403,
        "Requête refusée",
        "Cette requête n'est pas locale.",
        pageNonce,
      );
      return;
    }
    if (request.method !== "GET") {
      response.writeHead(405, {
        ...pageHeaders(pageNonce),
        Allow: "GET",
      });
      response.end(
        renderPage(
          "Méthode refusée",
          "Seules les redirections GET sont acceptées.",
          pageNonce,
        ),
      );
      return;
    }

    const callbackUrl = new URL(request.url ?? "/", redirectUri);
    if (callbackUrl.pathname === "/complete") {
      if (!codeAccepted) {
        reply(
          response,
          404,
          "Page introuvable",
          "Aucune connexion Microsoft n'est en cours de finalisation.",
          pageNonce,
        );
        return;
      }
      reply(
        response,
        200,
        "Autorisation reçue",
        "YourLauncher finalise maintenant le compte Xbox et Minecraft dans l'application.",
        pageNonce,
        {
          closeable: true,
          onFinished: () => {
            completionPageServed = true;
            resolveCompletionPage();
          },
        },
      );
      return;
    }
    if (callbackUrl.pathname !== "/") {
      reply(
        response,
        404,
        "Page introuvable",
        "Cette adresse n'est pas utilisée.",
        pageNonce,
      );
      return;
    }

    try {
      const { code } = parseMicrosoftOAuthCallback(callbackUrl, expectedState);
      codeAccepted = true;
      // Le code est retiré immédiatement de la barre d'adresse/historique.
      response.writeHead(303, {
        ...pageHeaders(pageNonce),
        Location: "/complete",
      });
      // Le 303 est mis en file avant que le code soit remis à MSAL. La grâce
      // appliquée par close() garde ensuite /complete disponible même si
      // l'échange du code est très rapide.
      response.end();
      settleCode(code);
    } catch (error) {
      reply(
        response,
        400,
        "Connexion non validée",
        "Reviens dans YourLauncher et relance la connexion Microsoft.",
        pageNonce,
      );
      settleError(
        error instanceof Error
          ? error
          : new MicrosoftOAuthCallbackError(
              "invalid_callback",
              "Callback Microsoft invalide.",
            ),
      );
    }
  };

  const ipv4Server = http.createServer(handleRequest);
  try {
    const port = await listenLoopback(ipv4Server, 0, "127.0.0.1");
    servers.push(ipv4Server);
    listeningHosts.push("127.0.0.1");
    redirectUri = `http://localhost:${port}`;

    // `localhost` peut être résolu en ::1 par le navigateur, indépendamment
    // de l'ordre de résolution choisi par Node. L'absence d'IPv6 n'empêche pas
    // le callback IPv4 de fonctionner.
    const ipv6Server = http.createServer(handleRequest);
    try {
      await listenLoopback(ipv6Server, port, "::1");
      servers.push(ipv6Server);
      listeningHosts.push("::1");
    } catch {
      await closeServer(ipv6Server, true);
    }
  } catch (error: unknown) {
    await closeServers([ipv4Server, ...servers], true);
    throw new MicrosoftOAuthCallbackError(
      "server_error",
      error instanceof Error
        ? `Impossible d'ouvrir le callback Microsoft (${error.message}).`
        : "Impossible d'ouvrir le callback Microsoft.",
    );
  }

  const onServerError = () => {
    settleError(
      new MicrosoftOAuthCallbackError(
        "server_error",
        "Le callback Microsoft local s'est interrompu.",
      ),
    );
  };
  for (const server of servers) server.on("error", onServerError);

  const onAbort = () => {
    settleError(
      new MicrosoftOAuthCallbackError(
        "cancelled",
        "Connexion Microsoft annulée.",
      ),
    );
    void closeServers(servers, true);
  };
  signal?.addEventListener("abort", onAbort, { once: true });
  // Le signal peut avoir été annulé entre le premier contrôle et la fin du
  // `listen()`. AbortSignal ne rejoue pas un événement déjà émis.
  if (signal?.aborted) onAbort();

  const timeout = setTimeout(() => {
    settleError(
      new MicrosoftOAuthCallbackError(
        "timeout",
        "La connexion Microsoft a expiré avant le retour du navigateur.",
      ),
    );
    void closeServers(servers, true);
  }, timeoutMs);
  timeout.unref();

  return {
    redirectUri,
    listeningHosts,
    waitForCode,
    async close() {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      for (const server of servers) server.off("error", onServerError);
      if (codeAccepted && !completionPageServed) {
        let graceTimeout: ReturnType<typeof setTimeout> | undefined;
        await Promise.race([
          completionPage,
          new Promise<void>((resolve) => {
            graceTimeout = setTimeout(resolve, COMPLETION_PAGE_GRACE_MS);
            graceTimeout.unref();
          }),
        ]);
        if (graceTimeout) clearTimeout(graceTimeout);
      }
      await closeServers(servers);
    },
  };
}
