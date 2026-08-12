import { z } from "zod";
import type { Account } from "../shared-types/ipc";
import { readResponseTextBounded } from "./bounded-response";
import { assertSafeRemoteUrl, normalizeBaseUrl } from "./security";

const RESPONSE_LIMIT_BYTES = 16 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
const RETRY_INTERVAL_MS = 15_000;

const OpenResponseSchema = z
  .object({
    sessionId: z.string().min(1).max(64),
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
    expiresAt: z.string().datetime(),
    heartbeatIntervalSeconds: z.number().int().min(10).max(60),
  })
  .strict();

const CommandSchema = z
  .object({
    id: z.string().uuid().nullable(),
    action: z.enum(["stop_game", "close_client"]),
    reason: z.string().min(1).max(500),
    code: z.string().min(1).max(64).optional(),
    source: z.enum(["admin", "policy"]),
  })
  .strict();

const HeartbeatResponseSchema = z
  .object({
    ok: z.literal(true),
    nextHeartbeatInSeconds: z.number().int().min(10).max(60),
    command: CommandSchema.nullable(),
  })
  .strict();

export interface LivePresenceCommand {
  id: string | null;
  action: "stop_game" | "close_client";
  reason: string;
  code?: string;
  source: "admin" | "policy";
}

interface PresenceContext {
  baseUrl: string;
  slug: string;
  account: Account;
}

interface PresenceSession {
  id: string;
  baseUrl: string;
  /** Bearer secret: memory-only, never returned to renderer/store/logs. */
  token: string;
  heartbeatMs: number;
}

interface PresenceCallbacks {
  executeCommand(command: LivePresenceCommand): Promise<void>;
  closeClient(reason: string): void;
  report(message: string): void;
}

type FetchLike = typeof fetch;

function contextKey(context: PresenceContext): string {
  return [
    normalizeBaseUrl(context.baseUrl),
    context.slug,
    context.account.type,
    context.account.uuid,
    context.account.username,
  ].join("#");
}

async function boundedJson(response: Response): Promise<unknown> {
  const text = await readResponseTextBounded(response, RESPONSE_LIMIT_BYTES);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error("PRESENCE_RESPONSE_INVALID");
  }
}

export class LivePresenceController {
  private desired: PresenceContext | null = null;
  private desiredKey: string | null = null;
  private session: PresenceSession | null = null;
  private gameRunning = false;
  private revision = 0;
  private timer: NodeJS.Timeout | null = null;
  private activeRequest: Promise<void> | null = null;
  private opening: { key: string; promise: Promise<boolean> } | null = null;
  private disposed = false;

  constructor(
    private readonly clientVersion: string,
    private readonly callbacks: PresenceCallbacks,
    private readonly fetchImpl: FetchLike = fetch,
  ) {}

  async connect(context: PresenceContext): Promise<boolean> {
    if (this.disposed) return false;
    const normalized: PresenceContext = {
      ...context,
      baseUrl: normalizeBaseUrl(context.baseUrl),
      account: {
        type: context.account.type,
        uuid: context.account.uuid,
        username: context.account.username,
        ...(context.account.avatarUrl
          ? { avatarUrl: context.account.avatarUrl }
          : {}),
      },
    };
    const key = contextKey(normalized);
    if (this.desiredKey === key && this.session) {
      this.schedule(0);
      return true;
    }
    if (this.desiredKey === key && this.opening?.key === key) {
      return this.opening.promise;
    }

    const oldSession = this.session;
    const revision = ++this.revision;
    this.clearTimer();
    this.session = null;
    this.desired = normalized;
    this.desiredKey = key;
    if (oldSession) {
      void this.closeRemote(oldSession, "launcher_changed").catch(() => {});
    }
    if (revision !== this.revision) return false;
    const promise = this.open(revision);
    this.opening = { key, promise };
    void promise.finally(() => {
      if (this.opening?.promise === promise) this.opening = null;
    });
    return promise;
  }

  async disconnect(
    reason: "client_quit" | "account_changed" | "launcher_changed",
  ): Promise<void> {
    ++this.revision;
    this.clearTimer();
    this.desired = null;
    this.desiredKey = null;
    this.opening = null;
    const session = this.session;
    this.session = null;
    if (session) void this.closeRemote(session, reason).catch(() => {});
  }

  setGameRunning(running: boolean): void {
    this.gameRunning = running;
    if (this.session) this.schedule(0);
  }

  /** Visible for deterministic integration tests; never exposed through IPC. */
  async heartbeatNow(): Promise<void> {
    await this.runHeartbeat();
  }

  async shutdown(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    ++this.revision;
    this.clearTimer();
    this.desired = null;
    this.desiredKey = null;
    const session = this.session;
    this.session = null;
    if (session) await this.closeRemote(session, "client_quit").catch(() => {});
  }

  private async open(revision: number): Promise<boolean> {
    const desired = this.desired;
    if (!desired || revision !== this.revision || this.disposed) return false;
    try {
      const endpoint =
        desired.baseUrl +
        "/api/launcher-presence/" +
        encodeURIComponent(desired.slug);
      await assertSafeRemoteUrl(endpoint, { allowLocalhost: true });
      const response = await this.fetchImpl(endpoint, {
        method: "POST",
        redirect: "error",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-YourLauncher-Client": "desktop",
        },
        body: JSON.stringify({
          account: {
            type: desired.account.type,
            uuid: desired.account.uuid,
            username: desired.account.username,
          },
          clientVersion: this.clientVersion,
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const json = await boundedJson(response);
      if (!response.ok) {
        const denial = z
          .object({
            code: z.string().optional(),
            message: z.string().optional(),
          })
          .passthrough()
          .safeParse(json);
        if (
          response.status === 403 &&
          denial.success &&
          denial.data.code &&
          denial.data.message
        ) {
          await this.handleCommand({
            id: null,
            action: "close_client",
            reason: denial.data.message,
            code: denial.data.code,
            source: "policy",
          });
          return false;
        }
        if (
          response.status === 404 &&
          denial.success &&
          denial.data.code === "PRESENCE_UNAVAILABLE"
        ) {
          this.callbacks.report(
            "Présence administrateur non prise en charge pour ce launcher.",
          );
          return false;
        }
        throw new Error("PRESENCE_OPEN_FAILED");
      }
      const parsed = OpenResponseSchema.safeParse(json);
      if (!parsed.success) throw new Error("PRESENCE_RESPONSE_INVALID");
      if (revision !== this.revision || this.disposed) {
        await this.closeRemote(
          {
            id: parsed.data.sessionId,
            baseUrl: desired.baseUrl,
            token: parsed.data.token,
            heartbeatMs: parsed.data.heartbeatIntervalSeconds * 1_000,
          },
          "launcher_changed",
        ).catch(() => {});
        return false;
      }
      this.session = {
        id: parsed.data.sessionId,
        baseUrl: desired.baseUrl,
        token: parsed.data.token,
        heartbeatMs: parsed.data.heartbeatIntervalSeconds * 1_000,
      };
      this.callbacks.report("Présence administrateur connectée.");
      this.schedule(this.gameRunning ? 0 : this.session.heartbeatMs);
      return true;
    } catch {
      if (revision === this.revision && !this.disposed) {
        this.callbacks.report(
          "Présence administrateur temporairement indisponible.",
        );
        this.schedule(RETRY_INTERVAL_MS);
      }
      return false;
    }
  }

  private schedule(delayMs: number): void {
    this.clearTimer();
    if (this.disposed || !this.desired) return;
    this.timer = setTimeout(
      () => {
        this.timer = null;
        void this.runHeartbeat();
      },
      Math.max(0, delayMs),
    );
    this.timer.unref?.();
  }

  private clearTimer(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  private async runHeartbeat(): Promise<void> {
    if (this.disposed || !this.desired) return;
    if (this.activeRequest) return this.activeRequest;
    const revision = this.revision;
    this.activeRequest = (async () => {
      if (!this.session) {
        const desired = this.desired;
        if (desired) await this.connect(desired);
        return;
      }
      try {
        const result = await this.sendHeartbeat(this.session, null);
        if (revision !== this.revision || !result) return;
        if (result.command) await this.handleCommand(result.command);
        if (this.session && revision === this.revision) {
          this.schedule(result.nextHeartbeatInSeconds * 1_000);
        }
      } catch {
        if (revision !== this.revision) return;
        this.callbacks.report(
          "Heartbeat administrateur interrompu; nouvelle tentative.",
        );
        this.schedule(RETRY_INTERVAL_MS);
      }
    })().finally(() => {
      this.activeRequest = null;
    });
    return this.activeRequest;
  }

  private async sendHeartbeat(
    session: PresenceSession,
    acknowledgedCommandId: string | null,
  ): Promise<z.infer<typeof HeartbeatResponseSchema> | null> {
    if (!this.desired) return null;
    const endpoint = session.baseUrl + "/api/launcher-presence/session";
    await assertSafeRemoteUrl(endpoint, { allowLocalhost: true });
    const response = await this.fetchImpl(endpoint, {
      method: "POST",
      redirect: "error",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + session.token,
        "Content-Type": "application/json",
        "X-YourLauncher-Client": "desktop",
      },
      body: JSON.stringify({
        state: this.gameRunning ? "in_game" : "open",
        clientVersion: this.clientVersion,
        ...(acknowledgedCommandId ? { acknowledgedCommandId } : {}),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const json = await boundedJson(response);
    if (response.status === 401) {
      if (this.session?.id === session.id) this.session = null;
      this.schedule(0);
      return null;
    }
    if (!response.ok) throw new Error("PRESENCE_HEARTBEAT_FAILED");
    const parsed = HeartbeatResponseSchema.safeParse(json);
    if (!parsed.success) throw new Error("PRESENCE_RESPONSE_INVALID");
    return parsed.data;
  }

  private async handleCommand(command: LivePresenceCommand): Promise<void> {
    await this.callbacks.executeCommand(command);
    if (command.action === "close_client") {
      const session = this.session;
      this.session = null;
      this.clearTimer();
      if (session) {
        // Best-effort acknowledgement. A server outage must not delay the
        // administrative close action; TTL cleanup will close the row later.
        void this.closeRemote(
          session,
          command.source === "policy" ? "policy_denied" : "remote_command",
          command.id,
        ).catch(() => {});
      }
      this.callbacks.closeClient(command.reason);
      return;
    }
    if (command.id && this.session) {
      await this.sendHeartbeat(this.session, command.id);
    }
  }

  private async closeRemote(
    session: PresenceSession,
    reason:
      | "client_quit"
      | "account_changed"
      | "launcher_changed"
      | "remote_command"
      | "policy_denied",
    acknowledgedCommandId: string | null = null,
  ): Promise<void> {
    const endpoint = session.baseUrl + "/api/launcher-presence/session";
    await assertSafeRemoteUrl(endpoint, { allowLocalhost: true });
    await this.fetchImpl(endpoint, {
      method: "DELETE",
      redirect: "error",
      headers: {
        Accept: "application/json",
        Authorization: "Bearer " + session.token,
        "Content-Type": "application/json",
        "X-YourLauncher-Client": "desktop",
      },
      body: JSON.stringify({
        reason,
        ...(acknowledgedCommandId ? { acknowledgedCommandId } : {}),
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }
}
