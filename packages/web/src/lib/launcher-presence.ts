import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { LauncherAccessAccountSchema } from "./launcher-access-contract";

export const PRESENCE_HEARTBEAT_INTERVAL_SECONDS = 15;
export const PRESENCE_TTL_MS = 75_000;
export const PRESENCE_HISTORY_RETENTION_MS = 7 * 24 * 60 * 60_000;

export const PresenceOpenSchema = z
  .object({
    account: LauncherAccessAccountSchema,
    clientVersion: z.string().trim().min(1).max(64),
  })
  .strict();

export const PresenceHeartbeatSchema = z
  .object({
    state: z.enum(["open", "in_game"]),
    clientVersion: z.string().trim().min(1).max(64),
    acknowledgedCommandId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const PresenceCloseSchema = z
  .object({
    reason: z.enum([
      "client_quit",
      "account_changed",
      "launcher_changed",
      "remote_command",
      "policy_denied",
    ]),
    acknowledgedCommandId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const AdminPresenceCommandSchema = z
  .object({
    action: z.enum(["stop_game", "close_client"]),
    reason: z.string().trim().min(3).max(500),
  })
  .strict();

export type PresenceCommandAction = z.infer<
  typeof AdminPresenceCommandSchema
>["action"];

/** Generates a 256-bit bearer token. Only `hashPresenceToken` is persisted. */
export function createPresenceToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashPresenceToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function readPresenceBearer(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization) return null;
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(authorization);
  return match?.[1] ?? null;
}

export function presenceExpiry(now = new Date()): Date {
  return new Date(now.getTime() + PRESENCE_TTL_MS);
}

export function policyCommand(input: {
  launcherPublished: boolean;
  launcherSuspended: boolean;
  ownerDisabled: boolean;
  playerBanned: boolean;
}): { action: "close_client"; reason: string; code: string } | null {
  if (!input.launcherPublished) {
    return {
      action: "close_client",
      code: "LAUNCHER_UNAVAILABLE",
      reason: "Ce launcher n'est plus publié.",
    };
  }
  if (input.launcherSuspended) {
    return {
      action: "close_client",
      code: "LAUNCHER_SUSPENDED",
      reason: "Ce launcher a été suspendu par un administrateur.",
    };
  }
  if (input.ownerDisabled) {
    return {
      action: "close_client",
      code: "OWNER_DISABLED",
      reason: "Le compte propriétaire de ce launcher est désactivé.",
    };
  }
  if (input.playerBanned) {
    return {
      action: "close_client",
      code: "PLAYER_BANNED",
      reason: "Cette identité est interdite sur ce launcher.",
    };
  }
  return null;
}
