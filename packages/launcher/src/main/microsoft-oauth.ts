import crypto from "node:crypto";
import http, { type IncomingMessage, type ServerResponse } from "node:http";

const DEFAULT_CALLBACK_TIMEOUT_MS = 5 * 60 * 1_000;
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

const PAGE_HEADERS = {
  "Cache-Control": "no-store",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'",
  "Content-Type": "text/html; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
} as const;

function renderPage(title: string, detail: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><style>body{font-family:system-ui,sans-serif;background:#0b0814;color:#f6f2ff;display:grid;place-items:center;min-height:100vh;margin:0}.card{max-width:32rem;padding:2rem;border:1px solid #493870;border-radius:1rem;background:#171126}h1{font-size:1.35rem}p{color:#cfc5e8;line-height:1.5}</style></head><body><main class="card"><h1>${title}</h1><p>${detail}</p></main></body></html>`;
}

function reply(
  response: ServerResponse,
  status: number,
  title: string,
  detail: string,
): void {
  response.writeHead(status, PAGE_HEADERS);
  response.end(renderPage(title, detail));
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    if (!server.listening) {
      resolve();
      return;
    }
    server.close(() => resolve());
    server.closeAllConnections?.();
    server.unref();
  });
}

/**
 * Démarre un serveur éphémère lié exclusivement à IPv4 loopback. Le hostname
 * de l'URI reste `localhost`, comme l'exige l'inscription d'application Azure
 * pour les applications Mobile et bureau.
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
  const server = http.createServer(
    (request: IncomingMessage, response: ServerResponse) => {
      if (!isLoopbackAddress(request.socket.remoteAddress)) {
        reply(response, 403, "Requête refusée", "Cette requête n'est pas locale.");
        return;
      }
      if (request.method !== "GET") {
        response.writeHead(405, { ...PAGE_HEADERS, Allow: "GET" });
        response.end(
          renderPage("Méthode refusée", "Seules les redirections GET sont acceptées."),
        );
        return;
      }

      const callbackUrl = new URL(request.url ?? "/", redirectUri);
      if (callbackUrl.pathname === "/complete") {
        reply(
          response,
          200,
          "Connexion terminée",
          "Tu peux fermer cet onglet et revenir dans YourLauncher.",
        );
        return;
      }
      if (callbackUrl.pathname !== "/") {
        reply(response, 404, "Page introuvable", "Cette adresse n'est pas utilisée.");
        return;
      }

      try {
        const { code } = parseMicrosoftOAuthCallback(
          callbackUrl,
          expectedState,
        );
        // Le code est retiré immédiatement de la barre d'adresse/historique.
        response.writeHead(303, {
          ...PAGE_HEADERS,
          Location: "/complete",
        });
        response.end();
        settleCode(code);
      } catch (error) {
        reply(
          response,
          400,
          "Connexion non validée",
          "Reviens dans YourLauncher et relance la connexion Microsoft.",
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
    },
  );

  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once("error", onError);
    server.listen(0, "127.0.0.1", () => {
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
      redirectUri = `http://localhost:${address.port}`;
      resolve();
    });
  }).catch(async (error: unknown) => {
    await closeServer(server);
    throw new MicrosoftOAuthCallbackError(
      "server_error",
      error instanceof Error
        ? `Impossible d'ouvrir le callback Microsoft (${error.message}).`
        : "Impossible d'ouvrir le callback Microsoft.",
    );
  });

  const onServerError = () => {
    settleError(
      new MicrosoftOAuthCallbackError(
        "server_error",
        "Le callback Microsoft local s'est interrompu.",
      ),
    );
  };
  server.on("error", onServerError);

  const onAbort = () => {
    settleError(
      new MicrosoftOAuthCallbackError(
        "cancelled",
        "Connexion Microsoft annulée.",
      ),
    );
    void closeServer(server);
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
    void closeServer(server);
  }, timeoutMs);
  timeout.unref();

  return {
    redirectUri,
    waitForCode,
    async close() {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      server.off("error", onServerError);
      await closeServer(server);
    },
  };
}
